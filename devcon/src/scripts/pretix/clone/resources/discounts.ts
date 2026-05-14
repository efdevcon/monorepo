import { PretixClient } from '../pretixClient'
import { CloneState, Snapshot, RawResource, CliOptions } from '../types'
import { saveState } from '../state'

const COPY_FIELDS = [
  'internal_name',
  'position',
  'all_sales_channels',
  'sales_channels',
  'condition_all_products',
  'condition_min_count',
  'condition_min_value',
  'condition_apply_to_addons',
  'discount_percentage',
  'discount_amount',
  'subevent_mode',
  'subevent_date_from',
  'subevent_date_to',
  'available_from',
  'available_until',
] as const

function remapItems(map: Record<string, number>, ids: number[] | undefined): number[] {
  if (!ids) return []
  return ids.map((id) => map[String(id)]).filter((x): x is number => typeof x === 'number')
}

function remapVariations(
  state: CloneState,
  snapshot: Snapshot,
  ids: number[] | undefined,
): number[] {
  if (!ids) return []
  const itemFor = new Map<number, number>()
  for (const it of snapshot.items) {
    for (const v of (it.variations as RawResource[] | undefined) ?? []) itemFor.set(v.id, it.id)
  }
  const out: number[] = []
  for (const vid of ids) {
    const iid = itemFor.get(vid)
    if (iid == null) continue
    const tvid = state.ids.variations[iid + ':' + vid]
    if (tvid) out.push(tvid)
  }
  return out
}

function bodyOf(src: RawResource, state: CloneState, snapshot: Snapshot): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of COPY_FIELDS) if (k in src) out[k] = src[k]
  out.condition_limit_products = remapItems(
    state.ids.items,
    src.condition_limit_products as number[] | undefined,
  )
  out.condition_limit_variations = remapVariations(
    state,
    snapshot,
    src.condition_limit_variations as number[] | undefined,
  )
  out.benefit_limit_products = remapItems(
    state.ids.items,
    src.benefit_limit_products as number[] | undefined,
  )
  out.benefit_limit_variations = remapVariations(
    state,
    snapshot,
    src.benefit_limit_variations as number[] | undefined,
  )
  return out
}

export async function applyDiscounts(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const map = state.ids.discounts
  if (!snapshot.discounts.length) {
    console.log('[discounts] none in snapshot, skipping')
    return
  }

  let existing: RawResource[] = []
  try {
    existing = await targetClient.getAll<RawResource>(targetClient.eventUrl('/discounts/'))
  } catch (err) {
    console.warn('[discounts] target endpoint unavailable, skipping:', (err as Error).message)
    return
  }
  const byInternal = new Map<string, RawResource>()
  for (const r of existing) {
    const internal = r.internal_name as string | undefined
    if (internal) byInternal.set(internal, r)
  }

  for (const src of snapshot.discounts) {
    const sourceId = String(src.id)
    const body = bodyOf(src, state, snapshot)
    if (map[sourceId]) {
      if (cli.dryRun) {
        console.log('[discounts] DRY RUN: PATCH ' + map[sourceId])
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/discounts/' + map[sourceId] + '/'), body)
      console.log('[discounts] patched id=' + map[sourceId])
      continue
    }
    const ident = src.internal_name as string | undefined
    const adopt = ident ? byInternal.get(ident) : undefined
    if (adopt) {
      map[sourceId] = adopt.id
      if (cli.dryRun) {
        console.log('[discounts] DRY RUN: adopt+PATCH ' + adopt.id)
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/discounts/' + adopt.id + '/'), body)
      saveState(state)
      console.log('[discounts] adopted+patched id=' + adopt.id)
      continue
    }
    if (cli.dryRun) {
      console.log('[discounts] DRY RUN: POST new discount "' + ident + '"')
      continue
    }
    const created = await targetClient.post<RawResource>(targetClient.eventUrl('/discounts/'), body)
    map[sourceId] = created.id
    saveState(state)
    console.log('[discounts] created id=' + created.id + ' "' + ident + '"')
  }
}
