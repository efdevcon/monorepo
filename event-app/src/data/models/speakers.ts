import { z } from "zod";

// Define SessionSchema type for forward reference
type SessionSchemaType = z.ZodType<import("./sessions").Session>;

// Speaker schema with lazy reference to SessionSchema for circular dependency
export const SpeakerSchema: z.ZodType<Speaker> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
    website: z.string().optional(),
    twitter: z.string().optional(),
    github: z.string().optional(),
    avatar: z.string().optional(),
    description: z.string().optional(),
    tracks: z.array(z.string()).optional(),
    eventDays: z.array(z.number()).optional(),
    // Provenance: which event/edition (and thus pretalx instance) this speaker
    // came from. Stamped by the data provider at fetch time.
    eventId: z.string().optional(),
    eventLabel: z.string().optional(),
    sessions: z.lazy(() => {
      const { SessionSchema } = require("./sessions");
      return z.array(SessionSchema as SessionSchemaType).optional();
    }),
  })
) as z.ZodType<Speaker>;

export type Speaker = {
  id: string;
  name: string;
  role?: string;
  company?: string;
  website?: string;
  twitter?: string;
  github?: string;
  avatar?: string;
  description?: string;
  tracks?: string[];
  eventDays?: number[];
  /** Provenance: the event/edition id this speaker was fetched for. */
  eventId?: string;
  /** Human-readable label for `eventId` (e.g. "Devcon 7"). */
  eventLabel?: string;
  sessions?: import("./sessions").Session[];
};
