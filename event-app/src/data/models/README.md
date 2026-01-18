# Data Models

This directory contains TypeScript types and Zod schemas for runtime validation of all data models.

## Structure

Each model file exports:

- **Zod Schema** - For runtime validation (e.g., `RoomSchema`)
- **TypeScript Type** - Inferred from the schema (e.g., `Room`)

## Models

### `rooms.ts`

- **RoomSchema** - Validates room data
- **Room** - TypeScript type for rooms

### `sessions.ts`

- **SessionSchema** - Validates session data
- **Session** - TypeScript type for sessions
- References `SpeakerSchema` and `RoomSchema`

### `speakers.ts`

- **SpeakerSchema** - Validates speaker data (with lazy reference to SessionSchema for circular dependency)
- **Speaker** - TypeScript type for speakers

### `user.ts`

- **UserSchema** - Validates user profile data
- **User** - TypeScript type for users

## Usage

```typescript
import {
  RoomSchema,
  SessionSchema,
  SpeakerSchema,
  UserSchema,
} from "@/data/models";
import type { Room, Session, Speaker, User } from "@/data/models";

// Validate data at runtime
const room = RoomSchema.parse(rawData); // Throws if invalid

// Or use safeParse for error handling
const result = SessionSchema.safeParse(rawData);
if (result.success) {
  const session: Session = result.data;
} else {
  console.error(result.error);
}
```

## Benefits

1. **Runtime Validation** - Zod schemas catch invalid data at runtime
2. **Type Safety** - TypeScript types inferred from schemas stay in sync
3. **Single Source of Truth** - Schema defines both validation rules and types
