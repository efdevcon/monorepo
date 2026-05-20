import { PretixClient } from '../pretixClient'
import { CloneState, Snapshot, RawResource, CliOptions } from '../types'
import { saveState } from '../state'
import { stripSuffix } from '../suffix'

const COPY_FIELDS_INITIAL = [
  'name',
  'size',
  'subevent',
  'release_after_exit',
  'close_when_sold_out',
  'closed',
] as const

function bodyInitial(src: RawResource): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of COPY_FIELDS_INITIAL) if (k in src) out[k] = src[k]
  // Names are copied verbatim — no test suffix. Adoption-time index still
  // strips legacy suffixes so previously-suffixed targets get re-adopted.
  // items/variations omitted here — set after items exist.
  return out
}

export async function applyQuotasWithoutLinks(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const map = state.ids.quotas

  const existing = await targetClient.getAll<RawResource>(targetClient.eventUrl('/quotas/'))
  const byName = new Map<string, RawResource>()
  // Strip the suffix when indexing so source names (no suffix) can adopt
  // pre-existing suffixed targets.
  for (const r of existing) byName.set(stripSuffix(String(r.name ?? '')), r)

  for (const src of snapshot.quotas) {
    const sourceId = String(src.id)
    const body = bodyInitial(src)
    if (map[sourceId]) {
      if (cli.dryRun) {
        console.log('[quotas] DRY RUN: PATCH ' + map[sourceId] + ' (no links)')
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/quotas/' + map[sourceId] + '/'), body)
      console.log('[quotas] patched id=' + map[sourceId] + ' (no links)')
      continue
    }
    const adopt = byName.get(String(src.name ?? ''))
    if (adopt) {
      map[sourceId] = adopt.id
      if (cli.dryRun) {
        console.log('[quotas] DRY RUN: adopt+PATCH ' + adopt.id)
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/quotas/' + adopt.id + '/'), body)
      saveState(state)
      console.log('[quotas] adopted id=' + adopt.id)
      continue
    }
    if (cli.dryRun) {
      console.log('[quotas] DRY RUN: POST new quota "' + src.name + '"')
      continue
    }
    const created = await targetClient.post<RawResource>(targetClient.eventUrl('/quotas/'), body)
    map[sourceId] = created.id
    saveState(state)
    console.log('[quotas] created id=' + created.id + ' name="' + src.name + '"')
  }
}

export async function linkQuotasToItems(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts

  // Source variation IDs aren't qualified by item — find their item by reverse lookup in snapshot.
  const itemForVariation = new Map<number, number>() // srcVariationId -> srcItemId
  for (const it of snapshot.items) {
    const vs = (it.variations as RawResource[] | undefined) ?? []
    for (const v of vs) itemForVariation.set(v.id, it.id)
  }

  for (const src of snapshot.quotas) {
    const targetId = state.ids.quotas[String(src.id)]
    if (!targetId) continue
    const srcItems = (src.items as number[] | undefined) ?? []
    const targetItems: number[] = []
    for (const sid of srcItems) {
      const tid = state.ids.items[String(sid)]
      if (tid) targetItems.push(tid)
    }
    const srcVariations = (src.variations as number[] | undefined) ?? []
    const targetVariations: number[] = []
    for (const svid of srcVariations) {
      const sItemId = itemForVariation.get(svid)
      if (sItemId == null) continue
      const tvid = state.ids.variations[sItemId + ':' + svid]
      if (tvid) targetVariations.push(tvid)
    }
    const body = { items: targetItems, variations: targetVariations }
    if (cli.dryRun) {
      console.log(
        '[quotas.link] DRY RUN: PATCH ' +
          targetId +
          ' items=' +
          targetItems.length +
          ' vars=' +
          targetVariations.length,
      )
    } else {
      await targetClient.patch(targetClient.eventUrl('/quotas/' + targetId + '/'), body)
      console.log(
        '[quotas.link] linked id=' +
          targetId +
          ' items=' +
          targetItems.length +
          ' vars=' +
          targetVariations.length,
      )
    }
  }
}
