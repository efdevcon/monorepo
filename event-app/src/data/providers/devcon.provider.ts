import { BaseProvider, type SessionFilters } from "./provider-interface";
import type { Room, Session, Speaker } from "../models";

// Pretalx API types
interface PretalxSpeaker {
  code: string;
  name: string;
  biography: string | null;
  avatar: string | null;
  submissions: string[];
}

interface PretalxRoom {
  id: number;
  name: string | { en?: string; [key: string]: string | undefined };
  description: string | { en?: string; [key: string]: string | undefined };
  capacity: number | null;
}

interface PretalxSlot {
  room: PretalxRoom | number | null;
  start: string | null;
  end: string | null;
}

interface PretalxTrack {
  id: number;
  name: string | { en?: string; [key: string]: string | undefined };
}

interface PretalxSubmissionType {
  id: number;
  name: string | { en?: string; [key: string]: string | undefined };
}

interface PretalxSubmission {
  code: string;
  title: string | { en?: string; [key: string]: string | undefined };
  abstract: string | null;
  description: string | null;
  duration: number;
  speakers: PretalxSpeaker[] | string[];
  track: PretalxTrack | number | string | null;
  submission_type: PretalxSubmissionType | number | string | null;
  // Older pretalx: "slot": object|null; Newer: "slots": array
  slot?: PretalxSlot | null;
  slots?: PretalxSlot[] | number[];
  tags: string[];
  state: string;
  image: string | null;
  resources: Array<{ resource: string; description: string }>;
}

function i18n(val: string | { en?: string; [key: string]: string | undefined } | null | undefined): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  return val.en || Object.values(val).find((v) => typeof v === "string" && v) || "";
}

/**
 * Fetch all pages from the pretalx proxy at /api/pretalx
 */
async function fetchAllPages<T>(path: string, params?: Record<string, string>): Promise<T[]> {
  const results: T[] = [];
  const query = new URLSearchParams({ path, ...params });
  let nextUrl: string | null = `/api/pretalx?${query.toString()}`;

  console.log(`[DevconProvider] fetchAllPages: ${path}`);

  while (nextUrl) {
    console.log(`[DevconProvider] fetching: ${nextUrl}`);
    const res: Response = await fetch(nextUrl);
    console.log(`[DevconProvider] response: ${res.status}`);
    if (!res.ok) throw new Error(`Pretalx API error ${res.status}: ${await res.text()}`);
    const data: { results?: T[]; next: string | null } = await res.json();
    console.log(`[DevconProvider] got ${data.results?.length ?? 0} results, next: ${data.next}`);
    results.push(...(data.results || []));

    // The "next" URL from pretalx points to the upstream — convert to our proxy
    if (data.next) {
      const upstream = new URL(data.next);
      const nextPath = upstream.pathname.replace(/^\/api\/events\/[^/]+/, "");
      const nextParams = new URLSearchParams({ path: nextPath });
      upstream.searchParams.forEach((v, k) => nextParams.set(k, v));
      nextUrl = `/api/pretalx?${nextParams.toString()}`;
    } else {
      nextUrl = null;
    }
  }

  console.log(`[DevconProvider] fetchAllPages done: ${results.length} total`);
  return results;
}

export class DevconProvider extends BaseProvider {
  private sessionsCache: Session[] | null = null;
  private speakersCache: Speaker[] | null = null;
  private roomsCache: Room[] | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL = 60_000; // 1 minute

  private isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.CACHE_TTL;
  }

  private async loadAll(): Promise<{
    sessions: Session[];
    speakers: Speaker[];
    rooms: Room[];
  }> {
    if (this.sessionsCache && this.speakersCache && this.roomsCache && this.isCacheValid()) {
      return {
        sessions: this.sessionsCache,
        speakers: this.speakersCache,
        rooms: this.roomsCache,
      };
    }

    console.log("[DevconProvider] loadAll: fetching from pretalx proxy...");
    const [submissions, pretalxSpeakers, pretalxRooms] = await Promise.all([
      fetchAllPages<PretalxSubmission>("/submissions/", { page_size: "100" }),
      fetchAllPages<PretalxSpeaker>("/speakers/", { page_size: "100" }),
      fetchAllPages<PretalxRoom>("/rooms/", { page_size: "100" }),
    ]);

    // Map rooms
    const rooms: Room[] = pretalxRooms.map((r) => ({
      id: String(r.id),
      name: i18n(r.name),
      description: i18n(r.description) || "Conference room",
      info: r.capacity ? `Capacity: ${r.capacity}` : "",
      capacity: r.capacity ?? undefined,
    }));

    // Map speakers
    const speakers: Speaker[] = pretalxSpeakers.map((s) => ({
      id: s.code,
      name: s.name,
      description: s.biography || undefined,
      avatar: s.avatar || undefined,
    }));

    const speakerMap = new Map(speakers.map((s) => [s.id, s]));
    const roomMap = new Map(rooms.map((r) => [r.id, r]));

    // Map submissions to sessions
    const sessions: Session[] = submissions.map((sub) => {
      // Resolve speakers
      const sessionSpeakers: Speaker[] = Array.isArray(sub.speakers)
        ? sub.speakers
            .map((sp) => {
              if (typeof sp === "string") return speakerMap.get(sp);
              return speakerMap.get(sp.code) || {
                id: sp.code,
                name: sp.name,
                description: sp.biography || undefined,
                avatar: sp.avatar || undefined,
              };
            })
            .filter((s): s is Speaker => !!s)
        : [];

      // Resolve slot — older pretalx uses "slot" (singular), newer uses "slots" (array)
      const slot = sub.slot && typeof sub.slot === "object"
        ? sub.slot
        : Array.isArray(sub.slots)
          ? (sub.slots as PretalxSlot[]).find(
              (s) => typeof s === "object" && s.start
            )
          : undefined;

      let room: Room | undefined;
      let start = 0;
      let end = 0;
      let day: string | undefined;
      let date: string | undefined;
      let dayOfWeek: string | undefined;

      if (slot && typeof slot === "object") {
        if (slot.start) {
          const startDate = new Date(slot.start);
          start = Math.floor(startDate.getTime() / 1000);
          date = startDate.toISOString().split("T")[0];
          dayOfWeek = startDate.toLocaleDateString("en-US", { weekday: "long" });
          // Calculate day number from event start (Nov 3)
          const eventStart = new Date("2026-11-03");
          const dayNum = Math.floor(
            (startDate.getTime() - eventStart.getTime()) / (24 * 60 * 60 * 1000)
          ) + 1;
          day = `Day ${dayNum}`;
        }
        if (slot.end) {
          end = Math.floor(new Date(slot.end).getTime() / 1000);
        }
        if (slot.room && typeof slot.room === "object") {
          const roomId = String(slot.room.id);
          room = roomMap.get(roomId) || {
            id: roomId,
            name: i18n(slot.room.name),
            description: i18n(slot.room.description) || "",
            info: "",
          };
        }
      }

      // Resolve track (can be object, string, number, or null)
      const track = sub.track
        ? typeof sub.track === "object"
          ? i18n(sub.track.name)
          : String(sub.track)
        : "General";

      // Resolve type (can be object, string, number, or null)
      const type = sub.submission_type
        ? typeof sub.submission_type === "object"
          ? i18n(sub.submission_type.name).toLowerCase()
          : String(sub.submission_type).toLowerCase()
        : "talk";

      return {
        id: sub.code,
        speakers: sessionSpeakers,
        title: i18n(sub.title),
        track,
        duration: sub.duration,
        start,
        end,
        day,
        date,
        dayOfWeek,
        room,
        type,
        description: sub.description || undefined,
        abstract: sub.abstract || undefined,
        tags: sub.tags || [],
        image: sub.image || undefined,
      };
    });

    console.log(`[DevconProvider] loadAll done: ${sessions.length} sessions, ${speakers.length} speakers, ${rooms.length} rooms`);
    console.log("[DevconProvider] sessions:", JSON.stringify(sessions, null, 2));

    this.sessionsCache = sessions;
    this.speakersCache = speakers;
    this.roomsCache = rooms;
    this.cacheTimestamp = Date.now();

    return { sessions, speakers, rooms };
  }

  // --------------------------------------------------------------------------
  // SESSION METHODS
  // --------------------------------------------------------------------------

  async getSessions(filters?: SessionFilters): Promise<Session[]> {
    const { sessions } = await this.loadAll();
    let result = [...sessions];

    if (filters) {
      if (filters.track) {
        result = result.filter((s) => s.track === filters.track);
      }
      if (filters.type) {
        result = result.filter((s) => s.type === filters.type);
      }
      if (filters.speakerId) {
        result = result.filter((s) =>
          s.speakers.some((sp) => sp.id === filters.speakerId)
        );
      }
      if (filters.roomId) {
        result = result.filter((s) => s.room?.id === filters.roomId);
      }
      if (filters.day) {
        result = result.filter((s) => s.day === filters.day);
      }
      if (filters.date) {
        result = result.filter((s) => s.date === filters.date);
      }
      if (filters.tags && filters.tags.length > 0) {
        result = result.filter((s) =>
          filters.tags!.some((tag) => s.tags?.includes(tag))
        );
      }
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.description?.toLowerCase().includes(q) ||
            s.speakers.some((sp) => sp.name.toLowerCase().includes(q))
        );
      }
    }

    console.log("[DevconProvider] getSessions: validating", result.length, "sessions");
    try {
      const validated = this.validateSessions(result);
      console.log("[DevconProvider] getSessions: validation passed");
      return validated;
    } catch (e) {
      console.error("[DevconProvider] getSessions: validation failed", e);
      throw e;
    }
  }

  async getSession(id: string): Promise<Session> {
    const { sessions } = await this.loadAll();
    const session = sessions.find((s) => s.id === id);
    if (!session) throw new Error(`Session not found: ${id}`);
    return this.validateSession(session);
  }

  async getSessionsBySpeaker(speakerId: string): Promise<Session[]> {
    const { sessions } = await this.loadAll();
    const result = sessions.filter((s) =>
      s.speakers.some((sp) => sp.id === speakerId)
    );
    return this.validateSessions(result);
  }

  async getSessionsByTrack(track: string): Promise<Session[]> {
    const { sessions } = await this.loadAll();
    const result = sessions.filter((s) => s.track === track);
    return this.validateSessions(result);
  }

  async getSessionsByDay(day: string): Promise<Session[]> {
    const { sessions } = await this.loadAll();
    const result = sessions.filter((s) => s.day === day);
    return this.validateSessions(result);
  }

  // --------------------------------------------------------------------------
  // SPEAKER METHODS
  // --------------------------------------------------------------------------

  async getSpeakers(): Promise<Speaker[]> {
    const { speakers } = await this.loadAll();
    return this.validateSpeakers(speakers);
  }

  async getSpeaker(id: string): Promise<Speaker> {
    const { speakers } = await this.loadAll();
    const speaker = speakers.find((s) => s.id === id);
    if (!speaker) throw new Error(`Speaker not found: ${id}`);
    return this.validateSpeaker(speaker);
  }

  async searchSpeakers(query: string): Promise<Speaker[]> {
    const { speakers } = await this.loadAll();
    const q = query.toLowerCase();
    const result = speakers.filter((s) => s.name.toLowerCase().includes(q));
    return this.validateSpeakers(result);
  }

  // --------------------------------------------------------------------------
  // ROOM METHODS
  // --------------------------------------------------------------------------

  async getRooms(): Promise<Room[]> {
    const { rooms } = await this.loadAll();
    return this.validateRooms(rooms);
  }

  async getRoom(id: string): Promise<Room> {
    const { rooms } = await this.loadAll();
    const room = rooms.find((r) => r.id === id);
    if (!room) throw new Error(`Room not found: ${id}`);
    return this.validateRoom(room);
  }
}
