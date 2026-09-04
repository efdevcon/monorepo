import { z } from "zod";
import type { ConferenceEvent, Room, Session, Speaker } from "../models";

// ---------------------------------------------------------------------------
// Wire shape: GET {api}/events/:id/bundle (devcon-api, controllers/events.ts)
// ---------------------------------------------------------------------------

export interface BundleEvent {
  id: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  featuredSpeakers?: string[];
}

export interface BundleRoom {
  id: string;
  name?: string;
  description?: string;
  info?: string;
  capacity?: number | null;
  youtubeStreamUrl_1?: string;
  youtubeStreamUrl_2?: string;
  youtubeStreamUrl_3?: string;
  youtubeStreamUrl_4?: string;
  translationUrl?: string;
}

export interface BundleSpeaker {
  id: string;
  name?: string;
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
  role?: string;
  company?: string;
}

export interface BundleSession {
  id: string;
  title?: string;
  description?: string;
  track?: string;
  type?: string;
  expertise?: string;
  tags?: string | string[];
  featured?: boolean;
  slot_start?: number | string;
  slot_end?: number | string;
  slot_roomId?: string;
  speakerIds?: string[];
  sources_youtubeId?: string;
  sources_streamethId?: string;
  sources_swarmHash?: string;
}

export interface EventBundle {
  version: string;
  event: BundleEvent;
  rooms: BundleRoom[];
  speakers: BundleSpeaker[];
  sessions: BundleSession[];
}

/** Dev-only validation (RUNTIME_VALIDATION); production uses `isBundleShaped`. */
export const BundleSchema = z.object({
  version: z.string(),
  event: z.object({ id: z.string() }).passthrough(),
  rooms: z.array(z.object({ id: z.string() }).passthrough()),
  speakers: z.array(z.object({ id: z.string() }).passthrough()),
  sessions: z.array(
    z.object({ id: z.string(), speakerIds: z.array(z.string()) }).passthrough()
  ),
});

// ---------------------------------------------------------------------------
// Persisted rows (Dexie tables eventSessions / eventSpeakers / eventRooms /
// eventMeta). Lean by design: ids instead of embedded objects, no undefined
// keys (see `compact`), times as the API's UTC millisecond instants.
// ---------------------------------------------------------------------------

export interface SessionRow {
  eventId: string;
  id: string;
  title: string;
  description: string;
  track: string;
  type: string;
  expertise: string;
  tags: string[];
  featured?: true;
  slotStart: number;
  slotEnd: number;
  roomId?: string;
  speakerIds: string[];
  sources_youtubeId?: string;
  sources_streamethId?: string;
  sources_swarmHash?: string;
}

export interface SpeakerRow {
  eventId: string;
  id: string;
  name: string;
  avatar?: string;
  description?: string;
  twitter?: string;
  github?: string;
  website?: string;
  role?: string;
  company?: string;
}

export interface RoomRow {
  eventId: string;
  id: string;
  name: string;
  description?: string;
  info?: string;
  capacity?: number;
  youtubeStreamUrl_1?: string;
  youtubeStreamUrl_2?: string;
  youtubeStreamUrl_3?: string;
  youtubeStreamUrl_4?: string;
  translationUrl?: string;
}

export interface EventMetaRow {
  eventId: string;
  /** Version the stored rows were built from (the bundle's own `version`). */
  version: string;
  /** When the rows were last replaced. */
  syncedAt: number;
  /** When the version was last confirmed unchanged (or replaced). */
  checkedAt: number;
  title?: string;
  startDate?: string;
  endDate?: string;
  featuredSpeakers?: string[];
}

export interface NormalizedRows {
  sessions: SessionRow[];
  speakers: SpeakerRow[];
  rooms: RoomRow[];
  meta: EventMetaRow;
}

// ---------------------------------------------------------------------------
// Read model: what hooks and components see. Same shapes as before the store
// existed (models/*), joined in memory from the rows above.
// ---------------------------------------------------------------------------

export interface EventSnapshot {
  eventId: string;
  sessions: Session[];
  speakers: Speaker[];
  rooms: Room[];
  event: ConferenceEvent | undefined;
  sessionById: Map<string, Session>;
  speakerById: Map<string, Speaker>;
  roomById: Map<string, Room>;
}
