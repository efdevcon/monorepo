import { PretixClient } from '../pretixClient'
import { CloneState, Snapshot, RawResource, CliOptions } from '../types'
import { saveState } from '../state'
import { stripMultilingual, suffixMultilingual } from '../suffix'

const ITEM_COPY = [
  'name',
  'internal_name',
  'default_price',
  'category',
  'admission',
  'description',
  'free_price',
  'free_price_suggestion',
  'tax_rule',
  'active',
  'position',
  // 'picture' intentionally omitted — file IDs don't transfer across Pretix instances.
  'available_from',
  'available_until',
  'require_voucher',
  'hide_without_voucher',
  'allow_cancel',
  'min_per_order',
  'max_per_order',
  'checkin_attention',
  'checkin_text',
  'has_variations',
  'require_membership',
  'require_membership_types',
  'grant_membership_type',
  'grant_membership_duration_like_event',
  'grant_membership_duration_days',
  'grant_membership_duration_months',
  'show_quota_left',
  'sales_channels',
  'issue_giftcard',
  'require_approval',
  'generate_tickets',
  'allow_waitinglist',
  'original_price',
  'personalized',
  'all_sales_channels',
] as const

const VARIATION_COPY = [
  'value',
  'default_price',
  'original_price',
  'active',
  'description',
  'position',
  'available_from',
  'available_until',
  'require_membership',
  'require_membership_types',
  'sales_channels',
] as const

/** Adoption key for variations — strips suffix so source values match suffixed targets. */
function pickStringValue(v: unknown): string {
  return stripMultilingual(v)
}

/**
 * Replicates an item's `picture` across Pretix instances. File IDs are
 * instance-bound, so we download the source-side public media URL, upload to
 * the target instance, and cache the resulting `file:<uuid>` reference in
 * the state file keyed by source item ID + URL. Cache is invalidated when
 * the source URL changes (i.e. picture replaced in prod).
 *
 * Returns null if the source has no picture or the upload fails — failures
 * are warnings, not blockers, since a missing image shouldn't stop the sync.
 */
async function ensureItemPicture(
  targetClient: PretixClient,
  src: RawResource,
  state: CloneState,
): Promise<string | null> {
  const sourceUrl = src.picture as string | null | undefined
  if (!sourceUrl) return null

  const sourceId = String(src.id)
  state.pictures = state.pictures ?? {}
  const cached = state.pictures[sourceId]
  if (cached && cached.sourceUrl === sourceUrl) {
    return cached.targetFileId
  }

  try {
    const dl = await fetch(sourceUrl)
    if (!dl.ok) {
      console.warn('[items.picture] download failed for item ' + sourceId + ': ' + dl.status)
      return null
    }
    const arrayBuf = await dl.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)
    const contentType = dl.headers.get('content-type') ?? 'application/octet-stream'
    const filename = decodeURIComponent(sourceUrl.split('/').pop() || 'image')
    const targetFileId = await targetClient.uploadFile(buffer, filename, contentType)
    state.pictures[sourceId] = { sourceUrl, targetFileId }
    console.log(
      '[items.picture] uploaded for item ' + sourceId + ' → ' + targetFileId + ' (' + filename + ')',
    )
    return targetFileId
  } catch (err) {
    console.warn(
      '[items.picture] upload failed for item ' + sourceId + ': ' + (err as Error).message,
    )
    return null
  }
}

function remap(
  map: Record<string, number>,
  sourceId: number | string | null | undefined,
): number | null {
  if (sourceId == null) return null
  const v = map[String(sourceId)]
  return v == null ? null : v
}

function buildItemBody(
  src: RawResource,
  state: CloneState,
  forCreate: boolean,
  targetPictureFileId: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of ITEM_COPY) if (k in src) out[k] = src[k]
  out.category = remap(state.ids.categories, src.category as number | null | undefined)
  out.tax_rule = remap(state.ids.tax_rules, src.tax_rule as number | null | undefined)
  if (targetPictureFileId) out.picture = targetPictureFileId
  // Suffix the buyer-facing display name (internal_name is left alone — it's the matching key).
  if ('name' in out) out.name = suffixMultilingual(out.name)
  if (forCreate) {
    // Pretix requires variations and add-ons inline on POST. Updating any of these
    // afterward requires the dedicated nested endpoints; PATCH/PUT is rejected.
    const srcVars = (src.variations as RawResource[] | undefined) ?? []
    if (srcVars.length) {
      out.variations = srcVars.map((v) => buildVariationBody(v))
    }
    const srcAddons = (src.addons as Array<Record<string, unknown>> | undefined) ?? []
    if (srcAddons.length) {
      out.addons = srcAddons.map((a) => ({
        addon_category: remap(state.ids.categories, a.addon_category as number),
        min_count: a.min_count,
        max_count: a.max_count,
        position: a.position,
        price_included: a.price_included,
        multi_allowed: a.multi_allowed,
      }))
    }
    // Bundles are NOT inlined here — they reference other items that may not
    // exist yet on the first creation pass. Bound in the bundle pass below.
  }
  return out
}

function buildVariationBody(src: RawResource): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of VARIATION_COPY) if (k in src) out[k] = src[k]
  // Variation `value` is intentionally NOT suffixed — the parent item name
  // already carries the suffix, and adding it to every variation produces noise.
  return out
}

async function reconcileVariations(opts: {
  targetClient: PretixClient
  state: CloneState
  cli: CliOptions
  sourceItemId: number
  targetItemId: number
  sourceVariations: RawResource[]
}): Promise<void> {
  const { targetClient, state, cli, sourceItemId, targetItemId, sourceVariations } = opts
  const existing = await targetClient.getAll<RawResource>(
    targetClient.eventUrl('/items/' + targetItemId + '/variations/'),
  )
  const byValue = new Map<string, RawResource>()
  for (const v of existing) byValue.set(pickStringValue(v.value), v)

  for (const sv of sourceVariations) {
    const compositeKey = sourceItemId + ':' + sv.id
    const body = buildVariationBody(sv)
    const mappedId = state.ids.variations[compositeKey]
    if (mappedId) {
      if (cli.dryRun) {
        console.log('[items.variations] DRY RUN: PATCH ' + mappedId)
        continue
      }
      await targetClient.patch(
        targetClient.eventUrl('/items/' + targetItemId + '/variations/' + mappedId + '/'),
        body,
      )
      continue
    }
    const adopt = byValue.get(pickStringValue(sv.value))
    if (adopt) {
      state.ids.variations[compositeKey] = adopt.id
      if (cli.dryRun) {
        console.log('[items.variations] DRY RUN: adopt+PATCH ' + adopt.id)
        continue
      }
      await targetClient.patch(
        targetClient.eventUrl('/items/' + targetItemId + '/variations/' + adopt.id + '/'),
        body,
      )
      saveState(state)
      continue
    }
    if (cli.dryRun) {
      console.log(
        '[items.variations] DRY RUN: POST new variation "' + pickStringValue(sv.value) + '"',
      )
      continue
    }
    const created = await targetClient.post<RawResource>(
      targetClient.eventUrl('/items/' + targetItemId + '/variations/'),
      body,
    )
    state.ids.variations[compositeKey] = created.id
    saveState(state)
  }
}

/**
 * Bundles reference other items by ID, so they can't be inlined on item create —
 * the referenced items may not exist yet. After all items are created, this
 * function clears any existing bundles for the target item and POSTs fresh
 * entries via the dedicated nested endpoint. Always idempotent.
 */
async function applyBundles(opts: {
  targetClient: PretixClient
  state: CloneState
  cli: CliOptions
  sourceItem: RawResource
  targetItemId: number
}): Promise<void> {
  const { targetClient, state, cli, sourceItem, targetItemId } = opts
  const srcBundles = (sourceItem.bundles as Array<Record<string, unknown>> | undefined) ?? []
  if (!srcBundles.length) return

  // Clear-and-recreate keeps bundles in sync without tracking individual entry IDs.
  if (cli.dryRun) {
    console.log(
      '[items.bundles] DRY RUN: clear+POST ' +
        srcBundles.length +
        ' bundles on item ' +
        targetItemId,
    )
    return
  }
  const existing = await targetClient.getAll<RawResource>(
    targetClient.eventUrl('/items/' + targetItemId + '/bundles/'),
  )
  for (const b of existing) {
    await targetClient.del(targetClient.eventUrl('/items/' + targetItemId + '/bundles/' + b.id + '/'))
  }

  for (const b of srcBundles) {
    const srcBundledItem = b.bundled_item as number | null
    const srcBundledVariation = b.bundled_variation as number | null
    const targetBundledItem = remap(state.ids.items, srcBundledItem)
    if (targetBundledItem == null) {
      console.warn(
        '[items.bundles] cannot resolve bundled_item ' +
          srcBundledItem +
          ' for item ' +
          targetItemId +
          ', skipping entry',
      )
      continue
    }
    let targetBundledVariation: number | null = null
    if (srcBundledItem != null && srcBundledVariation != null) {
      targetBundledVariation =
        state.ids.variations[srcBundledItem + ':' + srcBundledVariation] ?? null
    }
    const body = {
      bundled_item: targetBundledItem,
      bundled_variation: targetBundledVariation,
      count: b.count,
      designated_price: b.designated_price,
    }
    await targetClient.post(
      targetClient.eventUrl('/items/' + targetItemId + '/bundles/'),
      body,
    )
    console.log(
      '[items.bundles] created on item=' + targetItemId + ' bundled_item=' + targetBundledItem,
    )
  }
}

export async function applyItems(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const map = state.ids.items

  const existing = await targetClient.getAll<RawResource>(targetClient.eventUrl('/items/'))
  const byInternal = new Map<string, RawResource>()
  for (const r of existing) {
    const internal = (r.internal_name as string | undefined) || ''
    if (internal) byInternal.set(internal, r)
  }

  // Pass 1: items themselves + variations.
  for (const src of snapshot.items) {
    const sourceId = String(src.id)
    let targetId = map[sourceId]
    if (!targetId) {
      const adopt = byInternal.get((src.internal_name as string | undefined) || '')
      if (adopt) {
        targetId = adopt.id
        map[sourceId] = targetId
      }
    }
    const isCreate = !targetId
    // Upload picture before building the body so we can reference the new file ID.
    // Skipped on dry-run since uploads have side effects.
    const pictureFileId = cli.dryRun ? null : await ensureItemPicture(targetClient, src, state)
    const body = buildItemBody(src, state, isCreate, pictureFileId)
    if (targetId) {
      if (cli.dryRun) {
        console.log('[items] DRY RUN: PATCH ' + targetId)
      } else {
        await targetClient.patch(targetClient.eventUrl('/items/' + targetId + '/'), body)
        console.log('[items] patched id=' + targetId)
      }
    } else {
      if (cli.dryRun) {
        console.log('[items] DRY RUN: POST new item "' + (src.internal_name ?? src.name) + '"')
      } else {
        const created = await targetClient.post<RawResource>(targetClient.eventUrl('/items/'), body)
        targetId = created.id
        map[sourceId] = targetId
        // Capture variation IDs from the create response — Pretix returns them inline.
        const createdVars = (created.variations as RawResource[] | undefined) ?? []
        const srcVars = (src.variations as RawResource[] | undefined) ?? []
        for (let i = 0; i < Math.min(createdVars.length, srcVars.length); i++) {
          state.ids.variations[src.id + ':' + srcVars[i].id] = createdVars[i].id
        }
        saveState(state)
        console.log(
          '[items] created id=' + targetId + ' (variations: ' + createdVars.length + ')',
        )
      }
    }

    // For subsequent runs (PATCH path) reconcile variations through the nested endpoint.
    // Skip on the create path — variations were already created inline above.
    if (!isCreate && targetId && Array.isArray(src.variations)) {
      await reconcileVariations({
        targetClient,
        state,
        cli,
        sourceItemId: src.id,
        targetItemId: targetId,
        sourceVariations: src.variations as RawResource[],
      })
    }
  }
  saveState(state)

  // Pass 2: bundles (need all item IDs resolved first). Add-ons were inlined on
  // create (Pass 1) since they only reference categories, which exist already.
  for (const src of snapshot.items) {
    const targetId = map[String(src.id)]
    if (!targetId) continue
    if (Array.isArray(src.bundles) && (src.bundles as unknown[]).length) {
      await applyBundles({ targetClient, state, cli, sourceItem: src, targetItemId: targetId })
    }
  }
}
