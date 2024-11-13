import { Account, PrismaClient } from '@/db/clients/account'
import { PrismaClient as ScheduleClient } from '@prisma/client'
import dayjs from 'dayjs'

const LIMIT = 15
const client = new PrismaClient()
const scheduleClient = new ScheduleClient()

async function main() {
  const res = await fetch('https://api.devcon.org/sessions?size=1000&event=devcon-7')
  const { data } = await res.json()
  const sessions = data.items

  const daily = sessions.filter((i: any) => dayjs(i.slot_start).isSame(dayjs(), 'day') && i.slot_room.youtubeStreamUrl_1)
  const processedVideos = daily.filter((i: any) => !!i.sources_youtubeId)
  const missingVideos = daily.filter((i: any) => !i.sources_youtubeId)

  console.log('Missing videos')
  for (const session of missingVideos) {
    console.log(`- [${session.sourceId}] ${session.title}`)
  }

  console.log('Total sessions (all days) #', sessions.length)
  console.log('Dailly sessions (today) #', daily.length)
  console.log('Processed (today)', processedVideos.length)
  console.log('Missed (today)', missingVideos.length)
  console.log('Daily %', Math.round((processedVideos.length / daily.length) * 100))
}

main()
  .then(() => {
    console.log('Done')
    process.exit(0)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
