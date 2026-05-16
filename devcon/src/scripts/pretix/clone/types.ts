/**
 * Type definitions for the Pretix clone script.
 *
 * `Snapshot` is the on-disk representation of a source event's resources.
 * `CloneState` tracks source-id → target-id mappings across runs.
 */

export interface PretixEndpoint {
  baseUrl: string
  organizer: string
  event: string
}

export interface ResourceMap {
  // Plain numeric source-id → numeric target-id, except `variations`
  // which uses a composite "sourceItemId:sourceVariationId" key.
  [sourceKey: string]: number
}

export interface CloneState {
  source: PretixEndpoint
  target: PretixEndpoint
  createdAt: string
  lastSyncedAt: string
  ids: {
    categories: ResourceMap
    items: ResourceMap
    variations: ResourceMap
    questions: ResourceMap
    quotas: ResourceMap
    tax_rules: ResourceMap
    discounts: ResourceMap
    item_bundles: ResourceMap
    item_addons: ResourceMap
  }
  // Tracks file uploads so we don't re-upload an unchanged source picture on every run.
  // Keyed by source item ID. `sourceUrl` is the source-side public media URL we cloned;
  // `targetFileId` is the Pretix `file:<uuid>` reference assigned on the target instance.
  pictures?: { [sourceItemId: string]: { sourceUrl: string; targetFileId: string } }
  // Same shape as `pictures` but keyed by settings key (`logo_image`,
  // `invoice_logo_image`, …) for file-typed event settings.
  settingsFiles?: { [settingKey: string]: { sourceUrl: string; targetFileId: string } }
}

// Pretix returns numeric IDs and the rest of an opaque resource body.
// We carry the full body so we don't lose fields the script doesn't model.
export interface RawResource {
  id: number
  [key: string]: unknown
}

export interface Snapshot {
  source: PretixEndpoint
  pulledAt: string
  event: Record<string, unknown> // GET /organizers/{org}/events/{event}/
  settings: Record<string, unknown> // GET .../settings/
  tax_rules: RawResource[]
  categories: RawResource[]
  questions: RawResource[] // includes `options`
  quotas: RawResource[] // includes `items`, `variations` arrays
  items: RawResource[] // includes `variations`, `addons`, `bundles`
  discounts: RawResource[]
}

export type ResourceKey =
  | 'event'
  | 'settings'
  | 'tax_rules'
  | 'categories'
  | 'questions'
  | 'quotas'
  | 'items'
  | 'discounts'
  | 'addons'
  | 'bundles'

export interface CliOptions {
  pull: boolean
  push: boolean
  dryRun: boolean
  force: boolean
  prune: boolean
  yes: boolean
  only: ResourceKey | null
}
