/**
 * Swappable event data sources. The active dataset is chosen via the `?dataset`
 * URL param (set by the debug panel) and read at fetch time by the data
 * provider, so the same hooks can load the current event or an old one (Devcon
 * 7) for testing. Changing it should reload the page (the debug panel does).
 */

export type DatasetKey = "current" | "devcon-7";

export interface Dataset {
  key: DatasetKey;
  label: string;
  apiUrl: string;
  eventId: string;
}

const ENV_API =
  process.env.NEXT_PUBLIC_DEVCON_API_URL || "https://api.devcon.org";
const ENV_EVENT =
  process.env.NEXT_PUBLIC_DEVCON_API_EVENT_ID || "devcon-mumbai-playground";

export const DATASETS: Record<DatasetKey, Dataset> = {
  current: {
    key: "current",
    label: `Current (${ENV_EVENT})`,
    apiUrl: ENV_API,
    eventId: ENV_EVENT,
  },
  "devcon-7": {
    key: "devcon-7",
    label: "Devcon 7",
    // Same backend as "current" (the local devcon-api serves all events) —
    // hitting api.devcon.org directly from the browser would be CORS-blocked.
    apiUrl: ENV_API,
    eventId: "devcon-7",
  },
};

export function getActiveDatasetKey(): DatasetKey {
  if (typeof window === "undefined") return "current";
  const k = new URLSearchParams(window.location.search).get("dataset");
  return k === "devcon-7" ? "devcon-7" : "current";
}

export function getActiveDataset(): Dataset {
  return DATASETS[getActiveDatasetKey()];
}
