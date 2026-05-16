import { PretixClient } from '../pretixClient'
import { CloneState, Snapshot, RawResource, CliOptions } from '../types'
import { saveState } from '../state'
import { stripMultilingual } from '../suffix'

const COPY_FIELDS = [
  'name',
  'rate',
  'price_includes_tax',
  'eu_reverse_charge',
  'home_country',
  'internal_name',
] as const

/** Index key — strips legacy suffix so a previously-suffixed target still adopts. */
function pickName(resource: Record<string, unknown>): string {
  return stripMultilingual(resource.name)
}

function bodyOf(src: RawResource): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of COPY_FIELDS) if (k in src) out[k] = src[k]
  // Names are copied verbatim — no test suffix.
  return out
}

export async function applyTaxRules(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const map = state.ids.tax_rules

  // Build target index by name for first-run match.
  const existing = await targetClient.getAll<RawResource>(targetClient.eventUrl('/taxrules/'))
  const byName = new Map<string, RawResource>()
  for (const r of existing) byName.set(pickName(r), r)

  for (const src of snapshot.tax_rules) {
    const sourceId = String(src.id)
    const body = bodyOf(src)
    if (map[sourceId]) {
      if (cli.dryRun) {
        console.log('[tax_rules] DRY RUN: PATCH ' + map[sourceId])
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/taxrules/' + map[sourceId] + '/'), body)
      console.log('[tax_rules] patched id=' + map[sourceId])
      continue
    }
    const adopt = byName.get(pickName(src))
    if (adopt) {
      map[sourceId] = adopt.id
      if (cli.dryRun) {
        console.log('[tax_rules] DRY RUN: adopt+PATCH ' + adopt.id)
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/taxrules/' + adopt.id + '/'), body)
      saveState(state)
      console.log('[tax_rules] adopted+patched id=' + adopt.id)
      continue
    }
    if (cli.dryRun) {
      console.log('[tax_rules] DRY RUN: POST new tax rule "' + pickName(src) + '"')
      continue
    }
    const created = await targetClient.post<RawResource>(targetClient.eventUrl('/taxrules/'), body)
    map[sourceId] = created.id
    saveState(state)
    console.log('[tax_rules] created id=' + created.id)
  }
}
