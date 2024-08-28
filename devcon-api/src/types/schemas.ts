import { z } from 'zod'

export const PretalxScheduleUpdate = z.object({
  event: z.string(),
  user: z.string(),
  schedule: z.string(),
  changes: z.object({
    new_talks: z.array(z.string()),
    canceled_talks: z.array(z.string()),
    moved_talks: z.array(z.string()),
  }),
})
