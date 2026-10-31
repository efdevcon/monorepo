/**
 * "Around the session": the span in which the session page treats a session
 * as the one on its stage, from LIVE_WINDOW_MS before the start to as long
 * after the end. Both the live transcript link (transcripts.ts) and the
 * livestream in the media slot (streams.ts, SessionMedia) follow it: each
 * stage has one channel and one stream, so outside this span they would
 * show someone else's talk. Times are unix seconds on the client; `nowMs`
 * comes from the mockable clock (useNowMs, `?mockNow=`).
 */
export const LIVE_WINDOW_MS = 10 * 60_000;

export function aroundSession(session: { start: number; end: number }, nowMs: number): boolean {
  return nowMs >= session.start * 1000 - LIVE_WINDOW_MS && nowMs <= session.end * 1000 + LIVE_WINDOW_MS;
}

/**
 * Sticky form for a page that stays open: the id of the session whose window
 * was seen open most recently, or `latchedId` while none is. A viewer who
 * opened the stream or the transcript during a session keeps it when the
 * ten minutes after the end pass (it is not pulled away under them); it only
 * yields when another session is shown in its place (the side panel swaps
 * sessions in the same view). The caller keeps the returned id in state and
 * treats `latched === session.id` as "on now".
 */
export function latchAroundSession(
  latchedId: string | null,
  session: { id: string; start: number; end: number },
  nowMs: number
): string | null {
  return aroundSession(session, nowMs) ? session.id : latchedId;
}
