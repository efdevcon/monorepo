/**
 * Push orchestrator. Applies the snapshot to the target in dependency order
 * and persists the state file after each phase.
 */
import { PretixClient } from './pretixClient'
import { applyEvent } from './resources/event'
import { applyTaxRules } from './resources/taxRules'
import { applyCategories } from './resources/categories'
import { applyQuestions, linkQuestionsToItems } from './resources/questions'
import { applyQuotasWithoutLinks, linkQuotasToItems } from './resources/quotas'
import { applyItems } from './resources/items'
import { applyDiscounts } from './resources/discounts'
import { CloneState, CliOptions, Snapshot } from './types'
import { saveState } from './state'

export async function applySnapshot(opts: {
  targetClient: PretixClient
  orgClient: PretixClient
  snapshot: Snapshot
  state: CloneState
  cli: CliOptions
  targetEventSlug: string
}): Promise<void> {
  const { targetClient, orgClient, snapshot, state, cli, targetEventSlug } = opts

  const phases: Array<{ key: string; run: () => Promise<void> }> = [
    {
      key: 'event',
      run: async () => {
        await applyEvent({ targetClient, orgClient, snapshot, cli, targetEventSlug })
      },
    },
    { key: 'tax_rules', run: () => applyTaxRules({ targetClient, snapshot, state, cli }) },
    { key: 'categories', run: () => applyCategories({ targetClient, snapshot, state, cli }) },
    { key: 'questions', run: () => applyQuestions({ targetClient, snapshot, state, cli }) },
    { key: 'quotas', run: () => applyQuotasWithoutLinks({ targetClient, snapshot, state, cli }) },
    { key: 'items', run: () => applyItems({ targetClient, snapshot, state, cli }) },
    { key: 'quotas-link', run: () => linkQuotasToItems({ targetClient, snapshot, state, cli }) },
    {
      key: 'questions-link',
      run: () => linkQuestionsToItems({ targetClient, snapshot, state, cli }),
    },
    { key: 'discounts', run: () => applyDiscounts({ targetClient, snapshot, state, cli }) },
  ]

  for (const phase of phases) {
    if (cli.only) {
      // `--only` keys are coarse — they map to the resource name.
      // event/settings → 'event'; quotas-link/questions-link map back to their root resources.
      const map: Record<string, string> = {
        'quotas-link': 'quotas',
        'questions-link': 'questions',
      }
      const effective = map[phase.key] ?? phase.key
      if (effective !== cli.only && phase.key !== cli.only) {
        continue
      }
    }
    console.log('--- phase: ' + phase.key + ' ---')
    await phase.run()
    saveState(state)
  }
}
