import { PretixClient } from '../pretixClient'
import { CloneState, Snapshot, RawResource, CliOptions } from '../types'
import { saveState } from '../state'
import { stripMultilingual, suffixMultilingual } from '../suffix'

const COPY_FIELDS = [
  'name',
  'internal_name',
  'description',
  'position',
  'is_addon',
  'cross_selling_mode',
] as const

function key(r: RawResource): string {
  // internal_name is a stable identifier we never suffix.
  const internal = r.internal_name as string | undefined
  if (internal && internal.length) return 'i:' + internal
  // Name fallback — strip any target-side suffix so source matches.
  return 'n:' + stripMultilingual(r.name)
}

function bodyOf(src: RawResource): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of COPY_FIELDS) if (k in src) out[k] = src[k]
  if ('name' in out) out.name = suffixMultilingual(out.name)
  return out
}

export async function applyCategories(opts: {
  targetClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, snapshot, state, cli } = opts
  const map = state.ids.categories

  const existing = await targetClient.getAll<RawResource>(targetClient.eventUrl('/categories/'))
  const byKey = new Map<string, RawResource>()
  for (const r of existing) byKey.set(key(r), r)

  for (const src of snapshot.categories) {
    const sourceId = String(src.id)
    const body = bodyOf(src)
    if (map[sourceId]) {
      if (cli.dryRun) {
        console.log('[categories] DRY RUN: PATCH ' + map[sourceId])
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/categories/' + map[sourceId] + '/'), body)
      console.log('[categories] patched id=' + map[sourceId])
      continue
    }
    const adopt = byKey.get(key(src))
    if (adopt) {
      map[sourceId] = adopt.id
      if (cli.dryRun) {
        console.log('[categories] DRY RUN: adopt+PATCH ' + adopt.id)
        continue
      }
      await targetClient.patch(targetClient.eventUrl('/categories/' + adopt.id + '/'), body)
      saveState(state)
      console.log('[categories] adopted+patched id=' + adopt.id)
      continue
    }
    if (cli.dryRun) {
      console.log('[categories] DRY RUN: POST new category ' + key(src))
      continue
    }
    const created = await targetClient.post<RawResource>(
      targetClient.eventUrl('/categories/'),
      body,
    )
    map[sourceId] = created.id
    saveState(state)
    console.log('[categories] created id=' + created.id)
  }
}
