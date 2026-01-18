// Export types and interfaces
export type { IEventDataAdapter, SessionFilters } from "./adapter-interface";

// Export base adapter class
export { BaseAdapter } from "./adapter-interface";

// Export dummy adapter for development/testing
export { DummyAdapter } from "./dummy.adapter";

// Export models for convenience
export type { Room, Session, Speaker, User } from "../models";
export {
  RoomSchema,
  SessionSchema,
  SpeakerSchema,
  UserSchema,
} from "../models";

// Export singleton adapter instance
export { adapter } from "./adapter";
