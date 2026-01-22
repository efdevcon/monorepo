// Export types and interfaces
export type { IEventDataProvider, SessionFilters } from "./provider-interface";

// Export base provider class
export { BaseProvider } from "./provider-interface";

// Export dummy provider for development/testing
export { DummyProvider } from "./dummy.provider";

// Export validation utilities
export { validateWithToast } from "./validation";

// Export models for convenience
export type { Room, Session, Speaker, User } from "../models";
export {
  RoomSchema,
  SessionSchema,
  SpeakerSchema,
  UserSchema,
} from "../models";

// Export singleton provider instance
export { provider } from "./provider";
