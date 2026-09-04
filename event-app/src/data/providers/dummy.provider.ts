import type { Dataset } from "../dataset";
import type { EventBundle } from "../store/types";
import type { IEventDataProvider } from "./provider-interface";

// Fixed instants so the fixture is deterministic (2024-11-13, devcon-7 week).
const T0 = Date.UTC(2024, 10, 13, 8, 30);
const HOUR = 60 * 60 * 1000;

/**
 * Sample data for development and tests: three rooms, three speakers, three
 * sessions, in the same wire shape as devcon-api's bundle endpoint.
 */
export class DummyProvider implements IEventDataProvider {
  async getVersion(): Promise<string> {
    return "dummy-1";
  }

  async getBundle(dataset: Dataset): Promise<EventBundle> {
    return {
      version: "dummy-1",
      event: {
        id: dataset.eventId,
        title: "Dummy Event",
        startDate: "2024-11-12",
        endDate: "2024-11-15",
        featuredSpeakers: ["speaker-1"],
      },
      rooms: [
        { id: "room-1", name: "Main Hall", description: "Large hall with stage", info: "Capacity: 500", capacity: 500 },
        { id: "room-2", name: "Workshop Room A", description: "Interactive workshop space", info: "Capacity: 50", capacity: 50 },
        { id: "room-3", name: "Workshop Room B", description: "Interactive workshop space", info: "Capacity: 50", capacity: 50 },
      ],
      speakers: [
        { id: "speaker-1", name: "Alice Developer", role: "Senior Engineer", company: "Tech Corp", website: "https://example.com", twitter: "alice", github: "alice-dev", description: "Expert in blockchain technology" },
        { id: "speaker-2", name: "Bob Builder", role: "CTO", company: "Startup Inc", twitter: "bob", github: "bob-builder", description: "Building decentralised systems" },
        { id: "speaker-3", name: "Charlie Creator", role: "Designer", company: "Design Studio", website: "https://charlie.design", description: "UX designer focused on Web3" },
      ],
      sessions: [
        { id: "session-1", title: "Introduction to Web3", track: "Web3", type: "Talk", expertise: "Beginner", tags: "beginner,web3", slot_start: T0, slot_end: T0 + HOUR, slot_roomId: "room-1", speakerIds: ["speaker-1", "speaker-2"], description: "Learn the basics of Web3 technology", featured: true },
        { id: "session-2", title: "Advanced Blockchain Development", track: "Web3", type: "Workshop", expertise: "Expert", tags: "advanced,development", slot_start: T0 + 2 * HOUR, slot_end: T0 + 3.5 * HOUR, slot_roomId: "room-2", speakerIds: ["speaker-1"], description: "Hands-on workshop for developers" },
        { id: "session-3", title: "Designing for Web3", track: "Design", type: "Talk", expertise: "Intermediate", tags: "design,ux", slot_start: T0 + 24 * HOUR, slot_end: T0 + 24.75 * HOUR, slot_roomId: "room-3", speakerIds: ["speaker-3"], description: "UX patterns for decentralised applications" },
      ],
    };
  }
}
