/**
 * Swappable event data sources. The active dataset is chosen via the `?dataset`
 * URL param (set by the debug panel) and read at fetch time by the data
 * provider, so the same hooks can load any registered event for testing.
 * Changing it should reload the page (the debug panel does).
 */

export type DatasetKey = "test-devcon-8" | "devcon8" | "devcon-7";

export interface Dataset {
  key: DatasetKey;
  label: string;
  apiUrl: string;
  /** Id the store files rows under; also the API event id unless `communityHubsOf` is set. */
  eventId: string;
  /**
   * Set on a Community Hubs dataset: the event whose `/events/:id/community-hubs/*`
   * endpoints serve it. Those bundles are built live from the hubs' sheets
   * and kept apart from the Pretalx schedule (own store, own cache rows).
   */
  communityHubsOf?: string;
  /**
   * Serve the bundle from a static file (under /public) instead of the API.
   * Test-only: lets the hubs' schedule be looked at before the API endpoint
   * is deployed. The file carries the usual `{ data: bundle }` envelope.
   */
  staticBundleUrl?: string;
  /**
   * Start of the conference (UTC ISO), i.e. morning of day 1 in the event's
   * local timezone. The debug panel uses this to mock "now" to the beginning of
   * the selected conference so schedule/live/today logic lands on day 1.
   */
  startDate: string;
  /**
   * IANA timezone of the venue. All session times render in this zone (the
   * API serves plain UTC instants and no timezone), so the schedule reads the
   * same everywhere in the world — see src/data/eventTime.ts.
   */
  timezone: string;
}

const ENV_API =
  process.env.NEXT_PUBLIC_DEVCON_API_URL || "https://api.devcon.org";
const ENV_EVENT = process.env.NEXT_PUBLIC_DEVCON_API_EVENT_ID;

export const DATASETS: Record<DatasetKey, Dataset> = {
  "test-devcon-8": {
    key: "test-devcon-8",
    label: "Test (test-devcon-8)",
    apiUrl: ENV_API,
    eventId: "test-devcon-8",
    // 2026-11-03 09:00 Asia/Kolkata (UTC+5:30)
    startDate: "2026-11-03T03:30:00Z",
    timezone: "Asia/Kolkata",
  },
  devcon8: {
    key: "devcon8",
    label: "Devcon 8 (devcon8)",
    apiUrl: ENV_API,
    eventId: "devcon8",
    // 2026-11-03 09:00 Asia/Kolkata (UTC+5:30)
    startDate: "2026-11-03T03:30:00Z",
    timezone: "Asia/Kolkata",
  },
  "devcon-7": {
    key: "devcon-7",
    label: "Devcon 7",
    apiUrl: ENV_API,
    eventId: "devcon-7",
    // Day 2 peak: 2024-11-13 15:30 Asia/Bangkok (UTC+7) — ~17 rooms live, so the
    // room screens and schedule look full on load.
    startDate: "2024-11-13T08:30:00Z",
    timezone: "Asia/Bangkok",
  },
};

/**
 * The Community Hubs programme of an event, loaded into its own store next to
 * the Pretalx schedule (the Schedule tab's "Community Hubs" segment). Not a
 * `?dataset` choice: it always follows the active event.
 */
export const COMMUNITY_HUB_DATASETS: Partial<Record<DatasetKey, Dataset>> = {
  devcon8: {
    key: "devcon8",
    label: "Devcon 8 Community Hubs",
    apiUrl: ENV_API,
    eventId: "devcon8-community-hubs",
    communityHubsOf: "devcon8",
    startDate: DATASETS.devcon8.startDate,
    timezone: DATASETS.devcon8.timezone,
  },
  "devcon-7": {
    key: "devcon-7",
    label: "Devcon 7 Community Hubs (test sheets)",
    apiUrl: ENV_API,
    eventId: "devcon-7-community-hubs",
    communityHubsOf: "devcon-7",
    // Snapshot of /events/devcon-7/community-hubs/bundle from the three test
    // sheets (2026-09-21); remove once the endpoint is on api.devcon.org.
    staticBundleUrl: "/community-hubs/devcon-7-bundle.json",
    startDate: DATASETS["devcon-7"].startDate,
    timezone: DATASETS["devcon-7"].timezone,
  },
};

export function communityHubsDataset(base: Dataset): Dataset | undefined {
  return COMMUNITY_HUB_DATASETS[base.key];
}

/**
 * Default dataset used when no `?dataset` param is present. Driven by
 * NEXT_PUBLIC_DEVCON_API_EVENT_ID per deployment; falls back to devcon-7 when
 * that env var is unset or not a known dataset key.
 */
export const DEFAULT_DATASET_KEY: DatasetKey =
  ENV_EVENT && ENV_EVENT in DATASETS ? (ENV_EVENT as DatasetKey) : "devcon-7";

export function getActiveDatasetKey(): DatasetKey {
  if (typeof window === "undefined") return DEFAULT_DATASET_KEY;
  const k = new URLSearchParams(window.location.search).get("dataset");
  return k && k in DATASETS ? (k as DatasetKey) : DEFAULT_DATASET_KEY;
}

export function getActiveDataset(): Dataset {
  return DATASETS[getActiveDatasetKey()];
}

/** Resolve the dataset that serves a given event id, if any. */
export function datasetForEventId(eventId: string): Dataset | undefined {
  return Object.values(DATASETS).find((d) => d.eventId === eventId);
}
