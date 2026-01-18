import { z } from "zod";
import type { Room, Session, Speaker, User } from "../models";
import {
  RoomSchema,
  SessionSchema,
  SpeakerSchema,
  UserSchema,
} from "../models";

// ============================================================================
// FILTER AND QUERY TYPES
// ============================================================================

export interface SessionFilters {
  track?: string;
  type?: string;
  speakerId?: string;
  roomId?: string;
  day?: string;
  date?: string;
  tags?: string[];
  search?: string;
}

// ============================================================================
// DATA ADAPTER INTERFACE
// ============================================================================

/**
 * IEventDataAdapter - The contract that any data layer implementation must fulfill
 *
 * This interface defines all the methods needed to power the event app frontend.
 * Implementations can fetch from APIs (Pretix, Pretalx), databases, static files, etc.
 * All returned data is validated using Zod schemas to ensure type safety.
 */
export interface IEventDataAdapter {
  // --------------------------------------------------------------------------
  // SESSION METHODS
  // --------------------------------------------------------------------------

  /**
   * Get all sessions with optional filtering
   * Returns validated Session[] using SessionSchema
   */
  getSessions(filters?: SessionFilters): Promise<Session[]>;

  /**
   * Get a single session by ID
   * Returns validated Session using SessionSchema
   */
  getSession(id: string): Promise<Session>;

  /**
   * Get sessions for a specific speaker
   * Returns validated Session[] using SessionSchema
   */
  getSessionsBySpeaker(speakerId: string): Promise<Session[]>;

  /**
   * Get sessions for a specific track
   * Returns validated Session[] using SessionSchema
   */
  getSessionsByTrack(track: string): Promise<Session[]>;

  /**
   * Get sessions for a specific day/date
   * Returns validated Session[] using SessionSchema
   */
  getSessionsByDay(day: string): Promise<Session[]>;

  // --------------------------------------------------------------------------
  // SPEAKER METHODS
  // --------------------------------------------------------------------------

  /**
   * Get all speakers
   * Returns validated Speaker[] using SpeakerSchema
   */
  getSpeakers(): Promise<Speaker[]>;

  /**
   * Get a single speaker by ID
   * Returns validated Speaker using SpeakerSchema
   */
  getSpeaker(id: string): Promise<Speaker>;

  /**
   * Search speakers by name
   * Returns validated Speaker[] using SpeakerSchema
   */
  searchSpeakers(query: string): Promise<Speaker[]>;

  // --------------------------------------------------------------------------
  // ROOM METHODS
  // --------------------------------------------------------------------------

  /**
   * Get all rooms
   * Returns validated Room[] using RoomSchema
   */
  getRooms(): Promise<Room[]>;

  /**
   * Get a single room by ID
   * Returns validated Room using RoomSchema
   */
  getRoom(id: string): Promise<Room>;

  // --------------------------------------------------------------------------
  // USER METHODS (Optional - for personalization features)
  // --------------------------------------------------------------------------

  /**
   * Get current user profile (requires authentication)
   * Returns validated User using UserSchema
   */
  getCurrentUser?(): Promise<User | null>;
}

// ============================================================================
// BASE ADAPTER CLASS
// ============================================================================

/**
 * Base adapter class that provides common validation logic
 * Extend this class to create specific adapter implementations
 */
export abstract class BaseAdapter implements IEventDataAdapter {
  /**
   * Enable/disable validation for performance.
   * Set to false for trusted data sources or when performance is critical.
   * Default: false (validation disabled)
   */
  protected validateData: boolean = false;

  /**
   * Validate and parse data using Zod schemas
   * Skips validation if validateData is false (for performance with large datasets)
   */
  protected validateRoom(data: unknown): Room {
    if (!this.validateData) return data as Room;
    return RoomSchema.parse(data);
  }

  protected validateRooms(data: unknown): Room[] {
    if (!this.validateData) return data as Room[];
    return z.array(RoomSchema).parse(data);
  }

  protected validateSession(data: unknown): Session {
    if (!this.validateData) return data as Session;
    return SessionSchema.parse(data);
  }

  protected validateSessions(data: unknown): Session[] {
    if (!this.validateData) return data as Session[];
    return z.array(SessionSchema).parse(data);
  }

  protected validateSpeaker(data: unknown): Speaker {
    if (!this.validateData) return data as Speaker;
    return SpeakerSchema.parse(data);
  }

  protected validateSpeakers(data: unknown): Speaker[] {
    if (!this.validateData) return data as Speaker[];
    return z.array(SpeakerSchema).parse(data);
  }

  protected validateUser(data: unknown): User {
    if (!this.validateData) return data as User;
    return UserSchema.parse(data);
  }

  // Abstract methods that must be implemented by subclasses
  abstract getSessions(filters?: SessionFilters): Promise<Session[]>;

  abstract getSession(id: string): Promise<Session>;

  abstract getSessionsBySpeaker(speakerId: string): Promise<Session[]>;

  abstract getSessionsByTrack(track: string): Promise<Session[]>;

  abstract getSessionsByDay(day: string): Promise<Session[]>;

  abstract getSpeakers(): Promise<Speaker[]>;

  abstract getSpeaker(id: string): Promise<Speaker>;

  abstract searchSpeakers(query: string): Promise<Speaker[]>;

  abstract getRooms(): Promise<Room[]>;

  abstract getRoom(id: string): Promise<Room>;
}
