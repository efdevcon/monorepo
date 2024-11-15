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

  console.log('Total sessions (all days) #', sessions.length)
  console.log()
  const days = [12, 13, 14, 15]

  for (const day of days) {
    const daySessions = sessions.filter(
      (i: any) =>
        dayjs(i.slot_start).isSame(dayjs(`Nov ${day}, 2024`), 'day') &&
        !i.doNotRecord &&
        (day === 12
          ? i.slot_room.youtubeStreamUrl_1
          : day === 13
          ? i.slot_room.youtubeStreamUrl_2
          : day === 14
          ? i.slot_room.youtubeStreamUrl_3
          : i.slot_room.youtubeStreamUrl_4)
    )
    const processedVideos = daySessions.filter((i: any) => !!i.sources_youtubeId || !!i.sources_streamethId)
    const missingVideos = daySessions.filter((i: any) => !i.sources_youtubeId && !i.sources_streamethId)
    const onYoutube = daySessions.filter((i: any) => !!i.sources_youtubeId)
    const onStreameth = daySessions.filter((i: any) => !!i.sources_streamethId)

    console.log('Missing videos on Nov', day)
    const groupedByRoom = missingVideos.reduce((acc: Record<string, any[]>, session: any) => {
      const roomId = session.slot_roomId
      if (!acc[roomId]) acc[roomId] = []
      acc[roomId].push(session)
      return acc
    }, {})

    Object.entries(groupedByRoom).forEach(([roomId, sessions]: any) => {
      console.log(`\n${roomId}:`)
      sessions.forEach((session: any) => {
        console.log(`  - [${session.sourceId}] ${session.title}`)
      })
    })

    console.log()
    console.log(`Daily sessions (day ${day}) #`, daySessions.length)
    console.log(`Processed (day ${day}) #`, processedVideos.length)
    console.log(`Missed (day ${day}) #`, missingVideos.length)
    console.log(`Daily % (day ${day}) #`, Math.round((processedVideos.length / daySessions.length) * 100))
    console.log(`On Youtube (day ${day}) #`, onYoutube.length)
    console.log(`On Streameth (day ${day}) #`, onStreameth.length)
    console.log('')
  }
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
