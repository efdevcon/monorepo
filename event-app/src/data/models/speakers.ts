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

/**
 * Drop generated placeholder avatars so only real uploaded photos reach the UI.
 *
 * devcon-api serves an inline `data:image/svg+xml` pixel identicon for every
 * speaker without an uploaded photo (all 729 of DC7's, ~560 bytes each). Each
 * one becomes an `<img>` whose source WebKit must instantiate as its own SVG
 * document plus raster buffer, and `loading="lazy"` can't defer a data URI
 * because there's no network fetch to postpone. With the speakers list mounting
 * ~750 cards at once, an A–Z jump smooth-scrolls the viewport across all of
 * them and forces that many rasterizations in a second or two; repeated rapid
 * jumps compounded it until iOS killed the content process (PR #112, "the app
 * crashes if you click multiple letters quickly in Jump to").
 *
 * Returning undefined hands these speakers to `Avatar`'s initials-on-pastel
 * fallback — zero images, and the treatment the component was written for.
 */
export function realAvatarOnly(avatar?: string | null): string | undefined {
  if (!avatar) return undefined;
  // Uploaded photos are always media URLs; a data URI is a generated stand-in.
  return avatar.startsWith("data:") ? undefined : avatar;
}
