/**
 * Pull phase: fetch the full set of clonable resources from a source event
 * and assemble a Snapshot. Pagination is handled by PretixClient.getAll.
 *
 * Resources NOT included (intentional): orders, vouchers, check-in lists,
 * webhooks, organizer-level entities. See spec for rationale.
 */
import { PretixClient } from './pretixClient'
import { writeSnapshot } from './state'
import { PretixEndpoint, RawResource, Snapshot } from './types'

export async function pullSnapshot(
  client: PretixClient,
  source: PretixEndpoint,
): Promise<{ snapshot: Snapshot; file: string }> {
  console.log('[pull] fetching event metadata...')
  const event = await client.getJson<Record<string, unknown>>(client.eventUrl('/'))

  console.log('[pull] fetching event settings...')
  const settings = await client.getJson<Record<string, unknown>>(client.eventUrl('/settings/'))

  console.log('[pull] fetching tax rules...')
  const tax_rules = await client.getAll<RawResource>(client.eventUrl('/taxrules/'))

  console.log('[pull] fetching categories...')
  const categories = await client.getAll<RawResource>(client.eventUrl('/categories/'))

  console.log('[pull] fetching questions...')
  const questions = await client.getAll<RawResource>(client.eventUrl('/questions/'))

  console.log('[pull] fetching quotas...')
  const quotas = await client.getAll<RawResource>(client.eventUrl('/quotas/'))

  console.log('[pull] fetching items...')
  const items = await client.getAll<RawResource>(client.eventUrl('/items/'))

  console.log('[pull] fetching discounts...')
  let discounts: RawResource[] = []
  try {
    discounts = await client.getAll<RawResource>(client.eventUrl('/discounts/'))
  } catch (err) {
    // Older Pretix versions may not expose /discounts/. Treat as empty.
    console.warn(
      '[pull] discounts endpoint unavailable, continuing with empty list:',
      (err as Error).message,
    )
  }

  const snapshot: Snapshot = {
    source,
    pulledAt: new Date().toISOString(),
    event,
    settings,
    tax_rules,
    categories,
    questions,
    quotas,
    items,
    discounts,
  }
  const file = writeSnapshot(snapshot)
  console.log('[pull] wrote snapshot to ' + file)
  console.log(
    '[pull] counts: ' +
      JSON.stringify({
        tax_rules: tax_rules.length,
        categories: categories.length,
        questions: questions.length,
        quotas: quotas.length,
        items: items.length,
        discounts: discounts.length,
      }),
  )
  return { snapshot, file }
}
