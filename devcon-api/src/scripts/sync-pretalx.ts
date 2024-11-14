import { GetData } from '@/clients/filesystem'
import { GetLastcheduleUpdate, GetRooms, GetSession, GetSessions, GetSpeakers } from '@/clients/pretalx'
import { CreatePresentationFromTemplate, RunPermissions } from '@/clients/slides'
import { pretalxToSessionData } from '@/types/schedule'
import fs from 'fs'

async function main() {
  console.log('Syncing Pretalx...')

  await notifyClients()
  await syncEventData()
  await syncRooms()
  await syncSessions()
  await createPresentations()
  createGlossary()
}

async function notifyClients() {
  try {
    if (!process.env.WEBHOOK_MEERKAT_SECRET) {
      console.error('WEBHOOK_MEERKAT_SECRET is not set')
      return
    }

    const result = await fetch('https://meerkat.events/api/v1/sync/devcon/devcon-7', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WEBHOOK_MEERKAT_SECRET}`,
      },
    })

    if (result.ok) {
      console.log('Notified Meerkat')
    } else {
      console.error('Error notifying Meerkat', result)
    }
  } catch (error) {
    console.error('Error notifying Meerkat', error)
  }
}

function createGlossary() {
  const speakers = GetData('speakers')
  const sessions = GetData('sessions/devcon-7')

  let dictionary: string[] = []
  for (const session of sessions) {
    for (const speakerId of session.speakers) {
      const speaker = speakers.find((s: any) => s.id === speakerId)
      if (speaker) {
        dictionary.push(...speaker.name.split(' '))
      }
    }

    // dictionary.push(...session.title.split(' '))
  }

  dictionary = [...new Set(dictionary)]
  console.log(dictionary.join(';'))
}

async function syncEventData() {
  const event = fs.readFileSync(`./data/events/devcon-7.json`, 'utf8')
  const eventData = JSON.parse(event)
  fs.writeFileSync(`./data/events/devcon-7.json`, JSON.stringify({ ...eventData, version: Date.now().toString() }, null, 2))
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
    const roomFs = roomsFs.find((r: any) => r.id === room.id)
    fs.writeFileSync(
      `./data/rooms/devcon-7/${room.id}.json`,
      JSON.stringify(
        {
          ...roomFs,
          ...room,
        },
        null,
        2
      )
    )
  }

  // Update event data
  const event = GetData('events').find((e: any) => e.id === 'devcon-7')
  delete event.id
  const eventVersion = await GetLastcheduleUpdate()
  fs.writeFileSync(
    `./data/events/devcon-7.json`,
    JSON.stringify({ ...event, rooms: rooms.map((r: any) => r.id), version: eventVersion.toString() }, null, 2)
  )

  console.log('Synced Pretalx Rooms')
  console.log('')
}

async function syncSessions() {
  const speakers = (await GetSpeakers()).filter((s: any) => s.id && s.name && s.sourceId !== 'ADDJPN')
  const acceptedSpeakers: any[] = []

  if (!fs.existsSync(`./data/sessions/devcon-7`)) {
    fs.mkdirSync(`./data/sessions/devcon-7`)
  }
  const sessions = await GetSessions()
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
    const fsSession = sessionsFs.find((s: any) => s.id === session.id)
    if (session.speakers.length > 0) {
      acceptedSpeakers.push(...speakers.filter((s: any) => session.speakers.includes(s.id)))
    }

    fs.writeFileSync(
      `./data/sessions/devcon-7/${session.id}.json`,
      JSON.stringify(
        {
          ...fsSession,
          ...session,
        },
        null,
        2
      )
    )
  }

  console.log('Speakers Pretalx', speakers.length, 'Accepted Speakers', acceptedSpeakers.length)
  console.log('Sync Speakers')
  for (const speaker of acceptedSpeakers) {
    fs.writeFileSync(`./data/speakers/${speaker.id}.json`, JSON.stringify(speaker, null, 2))
  }

  console.log('Synced Pretalx Schedule')
  console.log('')
}

async function runPermissions() {
  const sessionsFs = GetData('sessions/devcon-7')
  const sessions = await GetSessions({ inclContacts: true })
  console.log('# of Submissions', sessions.length)

  for (const sessionFs of sessionsFs) {
    if (sessionFs.resources_presentation) {
      const session = sessions.find((s: any) => s.id === sessionFs.id)
      const speakerEmails = session?.speakers.map((speaker: any) => speaker.email).filter(Boolean)

      if (session && speakerEmails?.length > 0) {
        await RunPermissions(session.title, session.sourceId, speakerEmails)
      }
    }
  }

  console.log('All done')
}

async function createPresentations() {
  const sessionsFs = GetData('sessions/devcon-7')
  const sessions = await GetSessions({ inclContacts: true })
  console.log('# of Submissions', sessions.length)

  for (const sessionFs of sessionsFs) {
    if (!sessionFs.resources_presentation) {
      const session = sessions.find((s: any) => s.id === sessionFs.id)

      if (session) {
        const speakerEmails = session.speakers.map((speaker: any) => speaker.email).filter(Boolean)

        const id = await CreatePresentationFromTemplate(session.title, session.sourceId, speakerEmails)
        if (id) {
          fs.writeFileSync(
            `./data/sessions/devcon-7/${sessionFs.id}.json`,
            JSON.stringify({ ...sessionFs, resources_presentation: `https://docs.google.com/presentation/d/${id}` }, null, 2)
          )
        }
      } else {
        console.log(`Session ${sessionFs.id} not found in Pretalx data`)
      }
    }
  }
}

main()
  .then(async () => {
    console.log('All done!')
    process.exit(0)
  })
  .catch(async (e) => {
    console.error(e)
    process.exit(1)
  })
