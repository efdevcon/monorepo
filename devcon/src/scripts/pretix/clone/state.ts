/**
 * Snapshot file IO and clone-state file IO.
 *
 * - Snapshot path is deterministic per source organizer/event.
 * - State path is deterministic per source+target organizer/event so
 *   multiple clone targets can coexist without colliding.
 * - State writes are flushed on every change so partial-failure runs
 *   leave a usable file for resume.
 */
import * as fs from 'fs'
import * as path from 'path'
import { CloneState, PretixEndpoint, Snapshot } from './types'

const ROOT = path.resolve(__dirname, '..') // src/scripts/pretix/

export function snapshotPath(source: PretixEndpoint): string {
  return path.join(ROOT, 'snapshots', `${source.organizer}-${source.event}.snapshot.json`)
}

export function statePath(source: PretixEndpoint, target: PretixEndpoint): string {
  return path.join(
    ROOT,
    `.clone-state-${source.organizer}-${source.event}--to--${target.organizer}-${target.event}.json`,
  )
}

export function writeSnapshot(snapshot: Snapshot): string {
  const file = snapshotPath(snapshot.source)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  return file
}

export function readSnapshot(source: PretixEndpoint): Snapshot {
  const file = snapshotPath(source)
  if (!fs.existsSync(file)) {
    throw new Error('Snapshot not found at ' + file + '. Run with --pull first.')
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8')) as Snapshot
}

export function loadState(source: PretixEndpoint, target: PretixEndpoint): CloneState {
  const file = statePath(source, target)
  if (!fs.existsSync(file)) {
    const now = new Date().toISOString()
    return {
      source,
      target,
      createdAt: now,
      lastSyncedAt: now,
      ids: {
        categories: {},
        items: {},
        variations: {},
        questions: {},
        quotas: {},
        tax_rules: {},
        discounts: {},
        item_bundles: {},
        item_addons: {},
      },
    }
  }
  const raw = JSON.parse(fs.readFileSync(file, 'utf-8')) as CloneState
  // Sanity check — refuse if the state file points at a different target.
  if (
    raw.source.organizer !== source.organizer ||
    raw.source.event !== source.event ||
    raw.target.organizer !== target.organizer ||
    raw.target.event !== target.event
  ) {
    throw new Error('State file at ' + file + ' targets a different source/target pair.')
  }
  return raw
}

export function saveState(state: CloneState): void {
  state.lastSyncedAt = new Date().toISOString()
  const file = statePath(state.source, state.target)
  fs.writeFileSync(file, JSON.stringify(state, null, 2))
}
