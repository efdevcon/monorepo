import type { Room, Session, Speaker } from "../models";
import { BaseProvider, type SessionFilters } from "./provider-interface";

const API_BASE_URL =
  process.env.DEVCON_API_URL || "https://api.devcon.org";
const EVENT_ID = process.env.DEVCON_API_EVENT_ID || "devcon-mumbai-playground";

export class DevconApiProvider extends BaseProvider {
  private async fetchApi<T>(path: string): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`DevconAPI ${res.status}: ${url}`);
    const json = await res.json();
    return json.data;
  }

  private mapSession(raw: any): Session {
    const startMs = typeof raw.slot_start === "number"
      ? raw.slot_start
      : raw.slot_start ? new Date(raw.slot_start).getTime() : 0;
    const endMs = typeof raw.slot_end === "number"
      ? raw.slot_end
      : raw.slot_end ? new Date(raw.slot_end).getTime() : 0;

    const start = Math.floor(startMs / 1000);
    const end = Math.floor(endMs / 1000);
    const duration = end - start;

    const startDate = startMs ? new Date(startMs) : null;
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return {
      id: raw.id,
      title: raw.title,
      description: raw.description ?? "",
      abstract: raw.abstract ?? raw.description ?? "",
      track: raw.track ?? "",
      type: raw.type ?? "Talk",
      expertise: raw.expertise ?? "",
      duration,
      start,
      end,
      day: startDate ? String(startDate.getDay()) : undefined,
      date: startDate ? startDate.toISOString().split("T")[0] : undefined,
      dayOfWeek: startDate ? days[startDate.getDay()] : undefined,
      room: raw.slot_room
        ? this.mapRoom(raw.slot_room)
        : undefined,
      speakers: (raw.speakers ?? []).map((s: any) =>
        typeof s === "string" ? { id: s, name: s } : this.mapSpeaker(s)
      ),
      tags: typeof raw.tags === "string"
        ? raw.tags.split(",").map((t: string) => t.trim()).filter(Boolean)
        : raw.tags ?? [],
      resources: [],
    };
  }

  private mapSpeaker(raw: any): Speaker {
    return {
      id: raw.id,
      name: raw.name ?? "",
      description: raw.description ?? "",
      avatar: raw.avatar ?? "",
      twitter: raw.twitter,
      github: raw.github,
      role: raw.role,
      company: raw.company,
      website: raw.website,
    };
  }

  private mapRoom(raw: any): Room {
    return {
      id: raw.id,
      name: raw.name ?? "",
      description: raw.description ?? "",
      info: raw.info ?? "",
      capacity: raw.capacity,
    };
  }

  async getSessions(filters?: SessionFilters): Promise<Session[]> {
    const params = new URLSearchParams();
    if (filters?.track) params.set("track", filters.track);
    if (filters?.type) params.set("type", filters.type);
    if (filters?.roomId) params.set("room", filters.roomId);
    if (filters?.search) params.set("q", filters.search);
    params.set("size", "1000");

    const qs = params.toString();
    const data = await this.fetchApi<any>(
      `/events/${EVENT_ID}/sessions${qs ? `?${qs}` : ""}`
    );
    const items = data?.items ?? data ?? [];
    return this.validateSessions(items.map((s: any) => this.mapSession(s)));
  }

  async getSession(id: string): Promise<Session> {
    const data = await this.fetchApi<any>(`/sessions/${id}`);
    return this.validateSession(this.mapSession(data));
  }

  async getSessionsBySpeaker(speakerId: string): Promise<Session[]> {
    const data = await this.fetchApi<any>(
      `/speakers/${speakerId}/sessions?event=${EVENT_ID}`
    );
    const items = data?.items ?? data ?? [];
    return this.validateSessions(items.map((s: any) => this.mapSession(s)));
  }

  async getSessionsByTrack(track: string): Promise<Session[]> {
    return this.getSessions({ track });
  }

  async getSessionsByDay(day: string): Promise<Session[]> {
    const sessions = await this.getSessions();
    return sessions.filter((s) => s.day === day || s.date === day);
  }

  async getSpeakers(): Promise<Speaker[]> {
    const data = await this.fetchApi<any>(
      `/events/${EVENT_ID}/speakers?size=1000`
    );
    const items = data?.items ?? data ?? [];
    return this.validateSpeakers(items.map((s: any) => this.mapSpeaker(s)));
  }

  async getSpeaker(id: string): Promise<Speaker> {
    const data = await this.fetchApi<any>(`/speakers/${id}`);
    return this.validateSpeaker(this.mapSpeaker(data));
  }

  async searchSpeakers(query: string): Promise<Speaker[]> {
    const speakers = await this.getSpeakers();
    const q = query.toLowerCase();
    return speakers.filter((s) => s.name.toLowerCase().includes(q));
  }

  async getRooms(): Promise<Room[]> {
    const data = await this.fetchApi<any>(`/events/${EVENT_ID}/rooms`);
    const items = data?.items ?? data ?? [];
    return this.validateRooms(items.map((r: any) => this.mapRoom(r)));
  }

  async getRoom(id: string): Promise<Room> {
    const rooms = await this.getRooms();
    const room = rooms.find((r) => r.id === id);
    if (!room) throw new Error(`Room ${id} not found`);
    return room;
  }
}
