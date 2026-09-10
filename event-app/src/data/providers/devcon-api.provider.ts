import type { Dataset } from "../dataset";
import type { EventBundle } from "../store/types";
import type { IEventDataProvider } from "./provider-interface";

/**
 * Hard cap per request. Without it one hung request (captive-portal wifi
 * answers the TCP handshake and then nothing, and `navigator.onLine` stays
 * true) keeps the store's single in-flight sync pending forever: no retry
 * backoff, every trigger returns the same stuck promise, and the UI shows
 * "Loading schedule…" until the tab is closed.
 */
const REQUEST_TIMEOUT_MS = 10_000;

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const signal =
    typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
      ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      : undefined;
  const res = await fetch(url, { ...init, signal });
  if (!res.ok) throw new Error(`DevconAPI ${res.status}: ${url}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

/**
 * devcon-api source. Both endpoints are CDN-cached for 60 s; the version probe
 * is fetched with `no-cache` so the browser revalidates instead of serving its
 * own copy for another minute (the poll interval is also 60 s). The bundle
 * carries its own `version`, so an edge node lagging behind the version
 * endpoint self-heals on the next poll.
 */
export class DevconApiProvider implements IEventDataProvider {
  async getVersion(dataset: Dataset): Promise<string> {
    const version = await getJson<string | number>(
      `${dataset.apiUrl}/events/${dataset.eventId}/version`,
      { cache: "no-cache" }
    );
    return String(version);
  }

  async getBundle(dataset: Dataset): Promise<EventBundle> {
    return getJson<EventBundle>(
      `${dataset.apiUrl}/events/${dataset.eventId}/bundle`
    );
  }
}
