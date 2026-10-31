/**
 * Livestreams per stage, Devcon 8: one YouTube live video per stage for the
 * whole event, keyed by room id (devcon-api data/rooms/devcon8). The session
 * page embeds it in place of the session card while the session is on
 * (liveWindow.ts), through SessionMedia.
 *
 * The room data has a per-conference-day slot for this
 * (`youtubeStreamUrl_1..4`, hand-authored in devcon-api); it stays
 * authoritative when filled, this map is the fallback for an event that
 * streams one video per stage. Rooms missing here (Music Stage, the CLS
 * Builders Room) keep the card.
 */
const STREAM_VIDEO_IDS: Readonly<Record<string, string>> = {
  "main-stage-lotus": "Xb0myl-5NNE",
  "lotus-stage-1": "KPHJ7l7B9YE",
  "lotus-stage-2": "0UAw-UuQL-A",
  "lotus-stage-3": "lj92Gca2moM",
  "jasmine-stage-4": "MbX3qIXf98g",
  "workshop-1": "6A_AdH8N1dE",
  "workshop-2": "4UVt_kQ2Y3g",
  "lightning-stage": "9Kh0GtT8pGc",
  "community-led-stage": "Pnfy2q0i9r0",
};

/** The stage's stream as an embed URL, or null for a room without one. */
export function streamEmbedUrlForRoom(roomId: string | undefined): string | null {
  const id = roomId ? STREAM_VIDEO_IDS[roomId] : undefined;
  return id ? `https://www.youtube.com/embed/${id}` : null;
}
