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
  sessions?: import("./sessions").Session[];
};
