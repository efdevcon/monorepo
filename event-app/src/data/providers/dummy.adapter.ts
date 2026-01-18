import { BaseAdapter, type SessionFilters } from "./adapter-interface";
import type { Room, Session, Speaker } from "../models";

/**
 * Dummy adapter with sample data for development and testing
 */
export class DummyAdapter extends BaseAdapter {
  private dummyRooms: Room[] = [
    {
      id: "room-1",
      name: "Main Hall",
      description: "Large conference hall with stage",
      info: "Capacity: 500",
      capacity: 500,
    },
    {
      id: "room-2",
      name: "Workshop Room A",
      description: "Interactive workshop space",
      info: "Capacity: 50",
      capacity: 50,
    },
    {
      id: "room-3",
      name: "Workshop Room B",
      description: "Interactive workshop space",
      info: "Capacity: 50",
      capacity: 50,
    },
  ];

  private dummySpeakers: Speaker[] = [
    {
      id: "speaker-1",
      name: "Alice Developer",
      role: "Senior Engineer",
      company: "Tech Corp",
      website: "https://example.com",
      twitter: "@alice",
      github: "alice-dev",
      avatar: "https://i.pravatar.cc/150?img=1",
      description: "Expert in blockchain technology",
      tracks: ["Web3", "Infrastructure"],
      eventDays: [1, 2],
    },
    {
      id: "speaker-2",
      name: "Bob Builder",
      role: "CTO",
      company: "Startup Inc",
      twitter: "@bob",
      github: "bob-builder",
      avatar: "https://i.pravatar.cc/150?img=2",
      description: "Building the future of decentralized systems",
      tracks: ["Web3"],
      eventDays: [1],
    },
    {
      id: "speaker-3",
      name: "Charlie Creator",
      role: "Designer",
      company: "Design Studio",
      website: "https://charlie.design",
      avatar: "https://i.pravatar.cc/150?img=3",
      description: "UX designer focused on Web3 experiences",
      tracks: ["Design"],
      eventDays: [2],
    },
  ];

  private dummySessions: Session[] = [
    {
      id: "session-1",
      speakers: [this.dummySpeakers[0], this.dummySpeakers[1]],
      title: "Introduction to Web3",
      track: "Web3",
      duration: 60,
      start: 1699000000, // Unix timestamp
      end: 1699003600,
      day: "Day 1",
      date: "2024-01-15",
      dayOfWeek: "Monday",
      room: this.dummyRooms[0],
      type: "talk",
      description: "Learn the basics of Web3 technology",
      abstract: "This session covers the fundamentals...",
      tags: ["beginner", "web3"],
    },
    {
      id: "session-2",
      speakers: [this.dummySpeakers[0]],
      title: "Advanced Blockchain Development",
      track: "Web3",
      duration: 90,
      start: 1699007200,
      end: 1699010800,
      day: "Day 1",
      date: "2024-01-15",
      dayOfWeek: "Monday",
      room: this.dummyRooms[1],
      type: "workshop",
      description: "Hands-on workshop for developers",
      tags: ["advanced", "development"],
    },
    {
      id: "session-3",
      speakers: [this.dummySpeakers[2]],
      title: "Designing for Web3",
      track: "Design",
      duration: 45,
      start: 1699014400,
      end: 1699017100,
      day: "Day 2",
      date: "2024-01-16",
      dayOfWeek: "Tuesday",
      room: this.dummyRooms[2],
      type: "talk",
      description: "UX patterns for decentralized applications",
      tags: ["design", "ux"],
    },
  ];

  async getSessions(filters?: SessionFilters): Promise<Session[]> {
    let sessions = [...this.dummySessions];

    if (filters) {
      if (filters.track) {
        sessions = sessions.filter((s) => s.track === filters.track);
      }
      if (filters.type) {
        sessions = sessions.filter((s) => s.type === filters.type);
      }
      if (filters.speakerId) {
        sessions = sessions.filter((s) =>
          s.speakers.some((sp) => sp.id === filters.speakerId)
        );
      }
      if (filters.roomId) {
        sessions = sessions.filter((s) => s.room?.id === filters.roomId);
      }
      if (filters.day) {
        sessions = sessions.filter((s) => s.day === filters.day);
      }
      if (filters.date) {
        sessions = sessions.filter((s) => s.date === filters.date);
      }
      if (filters.tags && filters.tags.length > 0) {
        sessions = sessions.filter((s) =>
          filters.tags!.some((tag) => s.tags?.includes(tag))
        );
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        sessions = sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(searchLower) ||
            s.description?.toLowerCase().includes(searchLower) ||
            s.speakers.some((sp) => sp.name.toLowerCase().includes(searchLower))
        );
      }
    }

    return this.validateSessions(sessions);
  }

  async getSession(id: string): Promise<Session> {
    const session = this.dummySessions.find((s) => s.id === id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }
    return this.validateSession(session);
  }

  async getSessionsBySpeaker(speakerId: string): Promise<Session[]> {
    const sessions = this.dummySessions.filter((s) =>
      s.speakers.some((sp) => sp.id === speakerId)
    );
    return this.validateSessions(sessions);
  }

  async getSessionsByTrack(track: string): Promise<Session[]> {
    const sessions = this.dummySessions.filter((s) => s.track === track);
    return this.validateSessions(sessions);
  }

  async getSessionsByDay(day: string): Promise<Session[]> {
    const sessions = this.dummySessions.filter((s) => s.day === day);
    return this.validateSessions(sessions);
  }

  async getSpeakers(): Promise<Speaker[]> {
    return this.validateSpeakers(this.dummySpeakers);
  }

  async getSpeaker(id: string): Promise<Speaker> {
    const speaker = this.dummySpeakers.find((s) => s.id === id);
    if (!speaker) {
      throw new Error(`Speaker not found: ${id}`);
    }
    return this.validateSpeaker(speaker);
  }

  async searchSpeakers(query: string): Promise<Speaker[]> {
    const searchLower = query.toLowerCase();
    const speakers = this.dummySpeakers.filter((s) =>
      s.name.toLowerCase().includes(searchLower)
    );
    return this.validateSpeakers(speakers);
  }

  async getRooms(): Promise<Room[]> {
    return this.validateRooms(this.dummyRooms);
  }

  async getRoom(id: string): Promise<Room> {
    const room = this.dummyRooms.find((r) => r.id === id);
    if (!room) {
      throw new Error(`Room not found: ${id}`);
    }
    return this.validateRoom(room);
  }
}
