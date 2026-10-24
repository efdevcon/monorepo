import { DATASETS, DEFAULT_DATASET_KEY, type Dataset } from "./dataset";
import { detailHref } from "@/routing/viewParams";

/**
 * Links from the previous app. The Devcon 7 app (now on its netlify.app host,
 * see docs/app-domain-migration.md) addressed a session by its Pretalx code,
 * `/schedule/DNNSNX`; those links are still around and now land here, where
 * ids are slugs. The API knows sessions by code too, so a code-shaped id is
 * looked up: this event's own code opens the session here, a Devcon 7 code
 * goes to the talk's page on the archive, anything else falls through to the
 * usual "session not found". Used by `src/proxy.ts`.
 */

/**
 * Pretalx submission codes: six characters, capitals and digits. Session ids
 * are lowercase slugs, so the two never overlap.
 */
const PRETALX_CODE = /^[A-Z0-9]{6}$/;

/** The event the previous app showed. */
export const LEGACY_APP_EVENT = "devcon-7";
export const ARCHIVE_ORIGIN = "https://archive.devcon.org";

/** How long the lookup may hold a navigation before the page takes over. */
const LOOKUP_TIMEOUT_MS = 3000;

export function isPretalxCode(id: string): boolean {
  return PRETALX_CODE.test(id);
}

/**
 * Where a session found by its code opens: here when it belongs to this
 * event, on the archive (`/devcon-7/<id>/`) when it belongs to a past Devcon,
 * nowhere for other events (test clones).
 */
export function sessionLinkFor(
  session: { id: string; eventId: string },
  dataset: Dataset
): string | null {
  if (session.eventId === dataset.eventId) return detailHref("session", session.id);
  if (/^devcon-\d+$/.test(session.eventId)) {
    return `${ARCHIVE_ORIGIN}/${session.eventId}/${encodeURIComponent(session.id)}/`;
  }
  return null;
}

async function sessionByCode(
  apiUrl: string,
  eventId: string,
  code: string,
  signal: AbortSignal
): Promise<{ id: string; eventId: string } | null> {
  const res = await fetch(
    `${apiUrl}/sessions/${code}?event=${encodeURIComponent(eventId)}`,
    { signal }
  );
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { id?: unknown; eventId?: unknown } };
  const { id, eventId: found } = json.data ?? {};
  return typeof id === "string" && typeof found === "string" ? { id, eventId: found } : null;
}

/**
 * The URL an old-style `/schedule/<code>` link should redirect to, or null
 * when the id is not a code, the code is unknown, or the API can't be reached
 * in time (the page then shows its own "not found").
 */
export async function legacySessionRedirect(
  id: string,
  dataset: Dataset = DATASETS[DEFAULT_DATASET_KEY]
): Promise<string | null> {
  if (!isPretalxCode(id)) return null;
  // Scoped by event, not a bare lookup: ids and codes repeat across events
  // (test clones of past talks) and the bare lookup is last-loaded-wins.
  const events = [...new Set([dataset.eventId, LEGACY_APP_EVENT])];
  try {
    const signal = AbortSignal.timeout(LOOKUP_TIMEOUT_MS);
    const found = await Promise.all(
      events.map((eventId) => sessionByCode(dataset.apiUrl, eventId, id, signal))
    );
    const session = found.find((s) => s !== null);
    return session ? sessionLinkFor(session, dataset) : null;
  } catch {
    return null;
  }
}
