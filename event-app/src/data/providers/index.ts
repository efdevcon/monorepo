// Export the provider contract
export type { IEventDataProvider } from "./provider-interface";

// Export providers
export { DevconApiProvider } from "./devcon-api.provider";
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
