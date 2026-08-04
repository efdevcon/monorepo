import { z } from "zod";

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  info: z.string(),
  capacity: z.number().nullable().optional(),
  // Livestream config, hand-authored in devcon-api/data/rooms/<event>/*.json.
  // One embed URL per conference day (day 1 -> youtubeStreamUrl_1, ...).
  // Optional: rooms without streams (and stale cached rooms) simply lack them.
  youtubeStreamUrl_1: z.string().optional(),
  youtubeStreamUrl_2: z.string().optional(),
  youtubeStreamUrl_3: z.string().optional(),
  youtubeStreamUrl_4: z.string().optional(),
  translationUrl: z.string().optional(),
});

export type Room = z.infer<typeof RoomSchema>;
