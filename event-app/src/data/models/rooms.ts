import { z } from "zod";

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  info: z.string(),
  capacity: z.number().optional(),
});

export type Room = z.infer<typeof RoomSchema>;
