import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  slug: z.string(),
  lang: z.string(),
  name: z.string(),
  role: z.string(),
  description: z.string(),
  organization: z.string().optional(),
  country: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;
