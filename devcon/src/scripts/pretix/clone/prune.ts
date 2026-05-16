/**
 * Prune orphan resources on the target.
 *
 * Runs after all apply phases, when state.ids has been refreshed via adoption
 * + create. Any target resource whose ID is NOT in the values of
 * state.ids[type] is by definition absent from the source — apply would have
 * created or adopted it otherwise — so it's an orphan and gets DELETEd.
 *
 * Order is the REVERSE of apply to keep FK constraints satisfied:
 *   variations (per kept item) → discounts → items → quotas → questions →
 *   categories → tax_rules.
 *
 * Honors --dry-run (logs intent only) and --only (prunes just that type).
 * Failures on individual DELETEs are surfaced as warnings, not fatal — Pretix
 * may refuse to remove resources tied to test orders.
 */
import { PretixClient } from './pretixClient'
import { CliOptions, CloneState, RawResource } from './types'

function ownedIds(map: Record<string, number>): Set<number> {
  return new Set(Object.values(map))
}

async function deleteOrphans(opts: {
  targetClient: PretixClient
  cli: CliOptions
  resource: string
  endpoint: string
  owned: Set<number>
  labelFn: (r: RawResource) => string
}): Promise<void> {
  const { targetClient, cli, resource, endpoint, owned, labelFn } = opts
  let existing: RawResource[] = []
  try {
    existing = await targetClient.getAll<RawResource>(targetClient.eventUrl(endpoint))
  } catch (e) {
    console.warn('[prune.' + resource + '] failed to list: ' + (e as Error).message)
    return
  }
  const orphans = existing.filter((r) => !owned.has(r.id))
  if (!orphans.length) {
    console.log('[prune.' + resource + '] no orphans')
    return
  }
  for (const r of orphans) {
    const label = labelFn(r)
    if (cli.dryRun) {
      console.log('[prune.' + resource + '] DRY RUN: DELETE id=' + r.id + ' ' + label)
      continue
    }
    try {
      await targetClient.del(targetClient.eventUrl(endpoint + r.id + '/'))
      console.log('[prune.' + resource + '] deleted id=' + r.id + ' ' + label)
    } catch (e) {
      console.warn(
        '[prune.' + resource + '] failed to delete id=' + r.id + ' ' + label + ': ' + (e as Error).message,
      )
    }
  }
}

async function pruneVariations(opts: {
  targetClient: PretixClient
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, state, cli } = opts
  const ownedVariations = ownedIds(state.ids.variations)
  // Only walk variations on items we own — orphan items are about to be
  // deleted whole, which cascades their variations on the Pretix side.
  const ownedItemTargetIds = ownedIds(state.ids.items)
  for (const targetItemId of ownedItemTargetIds) {
    let existing: RawResource[] = []
    try {
      existing = await targetClient.getAll<RawResource>(
        targetClient.eventUrl('/items/' + targetItemId + '/variations/'),
      )
    } catch (e) {
      console.warn(
        '[prune.variations] failed to list item=' + targetItemId + ': ' + (e as Error).message,
      )
      continue
    }
    const orphans = existing.filter((v) => !ownedVariations.has(v.id))
    for (const v of orphans) {
      const value = typeof v.value === 'string' ? v.value : ''
      if (cli.dryRun) {
        console.log(
          '[prune.variations] DRY RUN: DELETE item=' + targetItemId + ' variation=' + v.id + ' "' + value + '"',
        )
        continue
      }
      try {
        await targetClient.del(
          targetClient.eventUrl('/items/' + targetItemId + '/variations/' + v.id + '/'),
        )
        console.log('[prune.variations] deleted item=' + targetItemId + ' variation=' + v.id)
      } catch (e) {
        console.warn(
          '[prune.variations] failed item=' +
            targetItemId +
            ' variation=' +
            v.id +
            ': ' +
            (e as Error).message,
        )
      }
    }
  }
}

function nameLabel(r: RawResource): string {
  const name = r.name as Record<string, string> | string | undefined
  if (typeof name === 'string') return '"' + name + '"'
  if (name && typeof name === 'object') {
    const v = name.en ?? Object.values(name)[0]
    return '"' + (v ?? '') + '"'
  }
  return ''
}

export async function pruneOrphans(opts: {
  targetClient: PretixClient
  state: CloneState
  cli: CliOptions
}): Promise<void> {
  const { targetClient, state, cli } = opts

  type Phase = {
    key: string
    only: string // matched against cli.only
    endpoint: string
    owned: Set<number>
    labelFn: (r: RawResource) => string
  }

  const phases: Phase[] = [
    {
      key: 'discounts',
      only: 'discounts',
      endpoint: '/discounts/',
      owned: ownedIds(state.ids.discounts),
      labelFn: (r) => '"' + ((r.internal_name as string | undefined) ?? '') + '"',
    },
    {
      key: 'items',
      only: 'items',
      endpoint: '/items/',
      owned: ownedIds(state.ids.items),
      labelFn: (r) => '"' + ((r.internal_name as string | undefined) ?? '') + '" ' + nameLabel(r),
    },
    {
      key: 'quotas',
      only: 'quotas',
      endpoint: '/quotas/',
      owned: ownedIds(state.ids.quotas),
      labelFn: (r) => '"' + ((r.name as string | undefined) ?? '') + '"',
    },
    {
      key: 'questions',
      only: 'questions',
      endpoint: '/questions/',
      owned: ownedIds(state.ids.questions),
      labelFn: (r) => '"' + ((r.identifier as string | undefined) ?? '') + '"',
    },
    {
      key: 'categories',
      only: 'categories',
      endpoint: '/categories/',
      owned: ownedIds(state.ids.categories),
      labelFn: nameLabel,
    },
    {
      key: 'tax_rules',
      only: 'tax_rules',
      endpoint: '/taxrules/',
      owned: ownedIds(state.ids.tax_rules),
      labelFn: nameLabel,
    },
  ]

  for (const phase of phases) {
    if (cli.only && cli.only !== phase.only) continue
    console.log('--- prune: ' + phase.key + ' ---')
    if (phase.key === 'items') {
      // Strip orphan variations off kept items before the parent-item prune
      // runs. Orphan items themselves cascade their variations on DELETE, so
      // we don't need a second pass.
      await pruneVariations({ targetClient, state, cli })
    }
    await deleteOrphans({
      targetClient,
      cli,
      resource: phase.key,
      endpoint: phase.endpoint,
      owned: phase.owned,
      labelFn: phase.labelFn,
    })
  }
}
