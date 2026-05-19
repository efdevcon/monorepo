/**
 * Pretix event clone — CLI entrypoint.
 *
 * Usage:
 *   pnpm pretix:clone --force              # reuse existing target slug
 *   pnpm pretix:clone --pull               # source → snapshot file
 *   pnpm pretix:clone --push               # snapshot file → target
 *   pnpm pretix:clone                      # pull then push
 *   pnpm pretix:clone --dry-run            # plan only, no writes
 *   pnpm pretix:clone --prune              # after apply, DELETE target resources not in source
 *   pnpm pretix:clone --only=questions     # restrict resource type
 *   pnpm pretix:clone --yes                # skip interactive confirm
 */
import * as readline from 'readline'
import { resolveEndpoints } from './clone/config'
import { PretixClient } from './clone/pretixClient'
import { pullSnapshot } from './clone/snapshot'
import { applySnapshot } from './clone/apply'
import { loadState, readSnapshot, saveState } from './clone/state'
import { CliOptions, ResourceKey } from './clone/types'

const KNOWN_ONLY: ResourceKey[] = [
  'event',
  'settings',
  'tax_rules',
  'categories',
  'questions',
  'quotas',
  'items',
  'discounts',
  'addons',
  'bundles',
]

function parseArgs(argv: string[]): CliOptions {
  const flags = new Set(argv.slice(2).filter((a) => a.startsWith('--') && !a.includes('=')))
  let only: ResourceKey | null = null
  for (const a of argv.slice(2)) {
    if (a.startsWith('--only=')) {
      const v = a.slice('--only='.length) as ResourceKey
      if (!KNOWN_ONLY.includes(v)) {
        console.error('Unknown --only value: ' + v + '. Allowed: ' + KNOWN_ONLY.join(', '))
        process.exit(2)
      }
      only = v
    }
  }
  const pull = flags.has('--pull')
  const push = flags.has('--push')
  const both = !pull && !push
  return {
    pull: pull || both,
    push: push || both,
    dryRun: flags.has('--dry-run'),
    force: flags.has('--force'),
    prune: flags.has('--prune'),
    yes: flags.has('--yes'),
    only,
  }
}

function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question(question, (answer) => {
      rl.close()
      resolve(/^y(es)?$/i.test(answer.trim()))
    })
  })
}

async function main() {
  const opts = parseArgs(process.argv)
  const { source, target } = resolveEndpoints()

  console.log('=== pretix clone ===')
  console.log('source: ' + source.baseUrl + '  ' + source.organizer + '/' + source.event)
  console.log('target: ' + target.baseUrl + '  ' + target.organizer + '/' + target.event)
  console.log('flags : ' + JSON.stringify(opts))
  console.log('')

  if (opts.pull) {
    const sourceClient = new PretixClient({
      baseUrl: source.baseUrl,
      organizer: source.organizer,
      event: source.event,
      token: source.token,
    })
    await pullSnapshot(sourceClient, {
      baseUrl: source.baseUrl,
      organizer: source.organizer,
      event: source.event,
    })
  }

  if (opts.push) {
    if (!opts.dryRun && !opts.yes) {
      const ok = await confirm(
        'About to write to ' +
          target.baseUrl +
          ' ' +
          target.organizer +
          '/' +
          target.event +
          '. Continue? [y/N] ',
      )
      if (!ok) {
        console.log('aborted')
        process.exit(0)
      }
    }

    const snapshot = readSnapshot({
      baseUrl: source.baseUrl,
      organizer: source.organizer,
      event: source.event,
    })
    const state = loadState(
      { baseUrl: source.baseUrl, organizer: source.organizer, event: source.event },
      { baseUrl: target.baseUrl, organizer: target.organizer, event: target.event },
    )
    const targetClient = new PretixClient({
      baseUrl: target.baseUrl,
      organizer: target.organizer,
      event: target.event,
      token: target.token,
    })
    const orgClient = new PretixClient({
      baseUrl: target.baseUrl,
      organizer: target.organizer,
      token: target.token,
    })
    await applySnapshot({
      targetClient,
      orgClient,
      snapshot,
      state,
      cli: opts,
      targetEventSlug: target.event,
    })
    saveState(state)
    console.log('=== done ===')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
