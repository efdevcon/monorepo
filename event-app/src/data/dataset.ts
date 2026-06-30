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
  eventId: string;
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
  },
  devcon8: {
    key: "devcon8",
    label: "Devcon 8 (devcon8)",
    apiUrl: ENV_API,
    eventId: "devcon8",
  },
  "devcon-7": {
    key: "devcon-7",
    label: "Devcon 7",
    apiUrl: ENV_API,
    eventId: "devcon-7",
  },
};

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
