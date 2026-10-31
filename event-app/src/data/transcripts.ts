/**
 * Live transcripts (LiveVoice) on the session page, Devcon 8.
 *
 * LiveVoice runs one listen channel per stage; attendees open it on their
 * phone to follow the live transcription of whatever is on that stage. Only
 * the stages below have one, keyed by room id (devcon-api
 * data/rooms/devcon8). Only the public listen links live here: the speak
 * links are the AV crew's and never go in the repo.
 *
 * The link shows only around the session itself (liveWindow.ts, shared with
 * the livestream): the channel carries the stage, not the session, so
 * outside that span it would show someone else's talk.
 *
 * Pure module, checked in `pnpm data:test`.
 */
import { aroundSession } from "./liveWindow";

/** LiveVoice join codes per stage. */
const TRANSCRIPT_JOIN_CODES: Readonly<Record<string, string>> = {
  "lotus-stage-1": "110441",
  "lotus-stage-2": "070324",
  // The Main Stage is the Lotus hall with its three stages combined; Lotus 2,
  // the biggest, carries the channel then.
  "main-stage-lotus": "070324",
  "lotus-stage-3": "487776",
  "jasmine-stage-4": "394808",
  "community-led-stage": "086156",
};

/** The stage's listen link (LiveVoice's streaming page with the join code filled in), or null for a room without a channel. */
export function transcriptUrlForRoom(roomId: string | undefined): string | null {
  const code = roomId ? TRANSCRIPT_JOIN_CODES[roomId] : undefined;
  return code ? `https://livevoice.io/en/streaming?join_code=${code}` : null;
}

/** The listen link to offer for this session right now, or null. */
export function sessionTranscriptUrl(
  session: { start: number; end: number; room?: { id: string } },
  nowMs: number
): string | null {
  const url = transcriptUrlForRoom(session.room?.id);
  return url && aroundSession(session, nowMs) ? url : null;
}
