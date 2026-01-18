import { z } from "zod";
import { RoomSchema } from "./rooms";
import { SpeakerSchema } from "./speakers";

export const SessionSchema = z.object({
  id: z.string(),
  speakers: z.array(SpeakerSchema),
  title: z.string(),
  track: z.string(),
  duration: z.number(),
  start: z.number(),
  end: z.number(),
  startTimeAsMoment: z.any().optional(), // Moment type - can be validated separately if needed
  endTimeAsMoment: z.any().optional(), // Moment type - can be validated separately if needed
  day: z.string().optional(),
  date: z.string().optional(),
  dayOfWeek: z.string().optional(),
  room: RoomSchema.optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  abstract: z.string().optional(),
  expertise: z.string().optional(),
  image: z.string().optional(),
  resources: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export type Session = z.infer<typeof SessionSchema>;
