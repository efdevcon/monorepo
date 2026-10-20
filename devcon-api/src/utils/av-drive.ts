// The AV team's Drive tree, shared by the intro cards (av-assets.ts) and the run
// of show (generate-run-of-show.ts) so both land in the same room and day folders:
//   <AV folder>/$$EVENT/<Room>/<Day N - Mon D>/   intro cards, run of show
//   <AV folder>/$$EVENT/<Room>/                   the stage's Q&A QR (same every day)
import dayjs from 'dayjs'

export const AV_EVENT_FOLDER = '$$EVENT'

// Folder name per room id; a room not listed uses its Pretalx name. Room ids
// are the slugified Pretalx names, so a rename in Pretalx changes the id: keep
// this map in step or files move to a freshly created folder (2026-10-14: the
// stages were renamed and the old "Lotus 1", "Jasmine", "CLS"... folders
// emptied out; the crew keeps its own files in them, so they are left alone).
export const AV_ROOM_FOLDERS: Record<string, string> = {
  'main-stage-lotus': 'Main Stage (Lotus)',
  'lotus-stage-1': 'Lotus Stage 1',
  'lotus-stage-2': 'Lotus Stage 2',
  'lotus-stage-3': 'Lotus Stage 3',
  'jasmine-stage-4': 'Jasmine Stage 4',
  'community-led-stage': 'Community Led Stage',
  'cls-builders-room': 'CLS - Builders Room',
  'lightning-stage': 'Lightning Stage',
  'music-stage': 'Music',
  'workshop-1': 'Workshop 1',
  'workshop-2': 'Workshop 2',
}

export function avRoomFolder(roomId: string, roomName?: string): string {
  return AV_ROOM_FOLDERS[roomId] ?? roomName ?? roomId
}

/** `day` is the event-local date (YYYY-MM-DD), `n` its 1-based number among the event's days. */
export function avDayFolder(day: string, n: number): string {
  return `Day ${n} - ${dayjs(day).format('MMM D')}`
}

/** The stage screen's Q&A code: it redirects to the Q&A of the session on stage (devcon /api/meerkat/). */
export function qaQrUrl(roomId: string): string {
  return `https://devcon.org/qr/meerkat/${roomId}`
}
/** av-assets manifest key of a stage's Q&A QR image (one per stage, the code never changes); the run of show links it from Digital Assets. */
export function qaQrKey(roomId: string): string {
  return `qaqr:${roomId}`
}
export function qaQrFileName(roomFolder: string): string {
  return `Q&A QR - ${roomFolder}.png`
}
