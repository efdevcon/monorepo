import { GetData } from '@/clients/filesystem'
import { GetRooms, GetSpeakers, GetSubmissions } from '@/clients/pretalx'
import { CreatePresentationFromTemplate } from '@/clients/slides'
import fs from 'fs'

async function main() {
  console.log('Syncing Pretalx...')
  await syncRooms()
  await syncSessions()
  // await createPresentations()
}

async function syncRooms() {
  if (!fs.existsSync('./data/rooms/devcon-7')) {
    fs.mkdirSync('./data/rooms/devcon-7')
  }

  const rooms = await GetRooms()
  const roomsFs = GetData('rooms/devcon-7')
  console.log('Rooms Pretalx', rooms.length, 'Rooms fs', roomsFs.length)

  console.log('Sync Rooms')
  for (const room of roomsFs) {
    if (!rooms.some((r: any) => r.id === room.id)) {
      console.log('- delete room', room.id)
      fs.unlinkSync(`./data/rooms/devcon-7/${room.id}.json`)
    }
  }

  for (const room of rooms) {
    fs.writeFileSync(`./data/rooms/devcon-7/${room.id}.json`, JSON.stringify(room, null, 2))
  }

  console.log('Synced Pretalx Rooms')
  console.log('')
}

async function syncSessions() {
  const speakers = await GetSpeakers()
  const acceptedSpeakers: any[] = []

  if (!fs.existsSync(`./data/sessions/devcon-7`)) {
    fs.mkdirSync(`./data/sessions/devcon-7`)
  }
  const sessions = await GetSubmissions()
  const sessionsFs = GetData('sessions/devcon-7')
  console.log('Sessions Pretalx', sessions.length, 'Sessions fs', sessionsFs.length)

  console.log('Sync Sessions')
  for (const session of sessionsFs) {
    if (!sessions.some((s: any) => s.id === session.id)) {
      console.log('- delete session', session.id)
      fs.unlinkSync(`./data/sessions/devcon-7/${session.id}.json`)
    }
  }

  for (const session of sessions) {
    if (session.speakers.length > 0) {
      acceptedSpeakers.push(...speakers.filter((s: any) => session.speakers.includes(s.id)))
    }

    fs.writeFileSync(`./data/sessions/devcon-7/${session.id}.json`, JSON.stringify(session, null, 2))
  }

  console.log('Speakers Pretalx', speakers.length, 'Accepted Speakers', acceptedSpeakers.length)
  console.log('Sync Speakers')
  for (const speaker of acceptedSpeakers) {
    fs.writeFileSync(`./data/speakers/${speaker.id}.json`, JSON.stringify(speaker, null, 2))
  }

  console.log('Synced Pretalx Schedule')
  console.log('')
}

async function createPresentations() {
  const sessionsFs = GetData('sessions/devcon-7')
  const sessions = await GetSubmissions({ inclContacts: true })
  console.log('# of Submissions', sessions.length)

  for (const sessionFs of sessionsFs) {
    if (!sessionFs.resources_presentation) {
      const session = sessions.find((s: any) => s.id === sessionFs.id)

      if (session) {
        const speakerEmails = session.speakers.map((speaker: any) => speaker.email).filter(Boolean)

        await CreatePresentationFromTemplate(session.title, session.sourceId, speakerEmails)
      } else {
        console.log(`Session ${sessionFs.id} not found in Pretalx data`)
      }
    }
  }
}

main()
  .then(async () => {
    console.log('All done!')
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
