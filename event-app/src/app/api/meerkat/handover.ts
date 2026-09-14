/**
 * Meerkat's public origin. `@meerkat-events/react` builds the same URLs from
 * its default `apiUrl`; keep the two in step if Meerkat ever moves.
 */
export const MEERKAT_URL = "https://app.meerkat.events";

/** Session ids are Pretalx slugs: letters, digits, dashes, underscores. */
const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

export function isSessionId(value: string): boolean {
  return SESSION_ID.test(value);
}

/** The Q&A page for a session, with the handover token attached. */
export function meerkatSessionUrl(sessionId: string, token: string): string {
  const url = new URL(`${MEERKAT_URL}/e/${encodeURIComponent(sessionId)}/qa`);
  url.searchParams.set("token", token);
  return url.toString();
}
