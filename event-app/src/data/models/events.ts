import { z } from "zod";

/**
 * Conference event metadata served by devcon-api (`/events/:id`).
 * Minimal on purpose: startDate/endDate anchor "day 1..N" logic (livestream
 * URL selection); add fields only when a consumer appears.
 */
export const EventSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ConferenceEvent = z.infer<typeof EventSchema>;
