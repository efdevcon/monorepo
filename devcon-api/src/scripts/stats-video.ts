import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import fs from 'fs'
import path from 'path'

dayjs.extend(utc)

const eventId = process.argv[2] || 'devcon-7'

// One entry per event day; day N uses the room's youtubeStreamUrl_N.
function eventDays(): dayjs.Dayjs[] {
  const eventFile = path.resolve(__dirname, `../../data/events/${eventId}.json`)
  const event = JSON.parse(fs.readFileSync(eventFile, 'utf8'))
  if (!event.startDate || !event.endDate) {
    throw new Error(`${eventId} has no startDate/endDate in data/events/${eventId}.json`)
  }
  const days: dayjs.Dayjs[] = []
  let d = dayjs.utc(event.startDate)
  const end = dayjs.utc(event.endDate)
  while (d.isBefore(end) || d.isSame(end, 'day')) {
    days.push(d)
    d = d.add(1, 'day')
  }
  return days
}

async function main() {
  const res = await fetch(`https://api.devcon.org/sessions?size=1000&event=${eventId}`)
  const { data } = await res.json()
  const sessions = data.items

  console.log(`Event: ${eventId} - total sessions (all days) #`, sessions.length)
  console.log()

  eventDays().forEach((dayDate, index) => {
    const day = dayDate.date()
    const streamField = `youtubeStreamUrl_${index + 1}`
    const daySessions = sessions.filter(
      (i: any) => dayjs.utc(i.slot_start).isSame(dayDate, 'day') && !i.doNotRecord && i.slot_room?.[streamField]
    )
    const processedVideos = daySessions.filter((i: any) => !!i.sources_youtubeId || !!i.sources_streamethId)
    const missingVideos = daySessions.filter((i: any) => !i.sources_youtubeId && !i.sources_streamethId)
    const onYoutube = daySessions.filter((i: any) => !!i.sources_youtubeId)
    const onStreameth = daySessions.filter((i: any) => !!i.sources_streamethId)

    console.log('Missing videos on', dayDate.format('MMM D'))
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
  })
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
