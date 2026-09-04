import { datasetForEventId } from "../dataset";
import { dayKeyToUtcMidnightMs, eventDayKey } from "../eventTime";
import type { ConferenceEvent, Room, Session, Speaker } from "../models";
import { compact } from "./normalize";
import type {
  EventMetaRow,
  EventSnapshot,
  RoomRow,
  SessionRow,
  SpeakerRow,
} from "./types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function emptySnapshot(eventId: string): EventSnapshot {
  return {
    eventId,
    sessions: [],
    speakers: [],
    rooms: [],
    event: undefined,
    sessionById: new Map(),
    speakerById: new Map(),
    roomById: new Map(),
  };
}

function eventLabel(eventId: string): string {
  return datasetForEventId(eventId)?.label ?? eventId;
}

export function toSpeaker(row: SpeakerRow): Speaker {
  return compact<Speaker>({
    id: row.id,
    name: row.name,
    avatar: row.avatar ?? "",
    description: row.description ?? "",
    twitter: row.twitter,
    github: row.github,
    website: row.website,
    role: row.role,
    company: row.company,
    eventId: row.eventId,
    eventLabel: eventLabel(row.eventId),
  });
}

/** A speaker id the bundle didn't resolve: render the id, as before the store. */
function placeholderSpeaker(id: string, eventId: string): Speaker {
  return { id, name: id, eventId, eventLabel: eventLabel(eventId) };
}

export function toRoom(row: RoomRow): Room {
  return compact<Room>({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    info: row.info ?? "",
    capacity: row.capacity,
    youtubeStreamUrl_1: row.youtubeStreamUrl_1,
    youtubeStreamUrl_2: row.youtubeStreamUrl_2,
    youtubeStreamUrl_3: row.youtubeStreamUrl_3,
    youtubeStreamUrl_4: row.youtubeStreamUrl_4,
    translationUrl: row.translationUrl,
  });
}

export function toSession(
  row: SessionRow,
  speakerById: Map<string, Speaker>,
  roomById: Map<string, Room>,
  eventId: string
): Session {
  const start = Math.floor(row.slotStart / 1000);
  const end = Math.floor(row.slotEnd / 1000);
  // Day fields are derived in the venue timezone (like the schedule UI), via
  // the day key's synthetic UTC midnight. Same derivation the old provider did.
  const date = row.slotStart ? eventDayKey(row.slotStart) : undefined;
  const utcMid = date ? new Date(dayKeyToUtcMidnightMs(date)) : null;

  return compact<Session>({
    id: row.id,
    title: row.title,
    description: row.description,
    track: row.track,
    type: row.type,
    expertise: row.expertise,
    duration: end - start,
    start,
    end,
    day: utcMid ? String(utcMid.getUTCDay()) : undefined,
    date,
    dayOfWeek: utcMid ? DAY_NAMES[utcMid.getUTCDay()] : undefined,
    room: row.roomId ? roomById.get(row.roomId) : undefined,
    speakers: row.speakerIds.map(
      (id) => speakerById.get(id) ?? placeholderSpeaker(id, eventId)
    ),
    featured: row.featured,
    tags: row.tags,
    resources: [],
    sources_youtubeId: row.sources_youtubeId,
    sources_streamethId: row.sources_streamethId,
    sources_swarmHash: row.sources_swarmHash,
  });
}

/**
 * Rows → immutable read model. Speakers and rooms are shared object
 * references across sessions (no copies), sessions are sorted by start.
 */
export function materialize(
  rows: {
    sessions: SessionRow[];
    speakers: SpeakerRow[];
    rooms: RoomRow[];
    meta: EventMetaRow | null;
  },
  eventId: string
): EventSnapshot {
  const speakerById = new Map(rows.speakers.map((r) => [r.id, toSpeaker(r)]));
  const roomById = new Map(rows.rooms.map((r) => [r.id, toRoom(r)]));
  const sessions = rows.sessions
    .map((r) => toSession(r, speakerById, roomById, eventId))
    .sort((a, b) => a.start - b.start || a.title.localeCompare(b.title));
  const event: ConferenceEvent | undefined = rows.meta
    ? compact<ConferenceEvent>({
        id: eventId,
        title: rows.meta.title,
        startDate: rows.meta.startDate,
        endDate: rows.meta.endDate,
        featuredSpeakers: rows.meta.featuredSpeakers,
      })
    : undefined;

  return {
    eventId,
    sessions,
    speakers: [...speakerById.values()],
    rooms: [...roomById.values()],
    event,
    sessionById: new Map(sessions.map((s) => [s.id, s])),
    speakerById,
    roomById,
  };
}
