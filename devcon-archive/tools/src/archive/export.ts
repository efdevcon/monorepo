import fs from 'fs'
import matter from 'gray-matter'
import { duration } from 'moment'
import fetch from 'node-fetch'
import { join } from 'path'
import slugify from 'slugify'
import { getVideoId } from '../../../src/utils/video'
require('dotenv').config()

const baseArchiveFolder = '../src/content/archive'

ExportAll()

async function ExportAll() {
  for (let i = 0; i < 7; i++) {
    console.log('Export archive', i)
    await ExportArchive(`${i}`)
  }

  console.log('Export speakers')
  await ExportSpeakers()
}

async function ExportSpeakers() {
  const dir = join(process.cwd(), '../src/content/profiles', 'en')
  const files = fs.readdirSync(dir, { withFileTypes: true }).filter(i => i.isFile() && i.name.endsWith('.md'))

  return files.map(i => {
    const fullPath = join(dir, i.name)
    const content = fs.readFileSync(fullPath, 'utf8')
    const doc = matter(content)
    const id = i.name.replace('.md', '')

    let speaker: any = {
      id: id,
      sourceId: doc.data.id || id,
      name: doc.data.name,
    }

    if (doc.data.description) speaker.description = doc.data.description
    if (doc.data.twitter)
      speaker.twitter = doc.data.twitter.replace('https://twitter.com/', '').replace('@', '').replace('/', '')
    if (doc.data.avatar) speaker.avatar = doc.data.avatar

    const path = join(process.cwd(), 'export', 'speakers', `${speaker.id}.json`)
    fs.writeFileSync(path, JSON.stringify(speaker, null, 2))

    return doc.data
  })
}

async function ExportSpeakersFromSession(speakers: string[]) {
  speakers.forEach(speaker => {
    const slug = slugify(speaker.toLowerCase(), { strict: true })
    if (!slug) return

    const sessionPath = join(process.cwd(), 'export', 'speakers', `${slug}.json`)
    fs.writeFileSync(
      sessionPath,
      JSON.stringify(
        {
          id: slug,
          sourceId: slug,
          name: speaker,
        },
        null,
        2
      )
    )
  })
}

async function ExportArchive(id: string) {
  const response = await fetch(`https://app.devcon.org/api/schedule`)
  const body = await response.json()
  const data = body.data

  const dir = join(process.cwd(), baseArchiveFolder, 'videos', id)
  const dirs = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      i =>
        i.isDirectory() &&
        fs.readdirSync(join(dir, i.name), { withFileTypes: true }).some(i => i.isFile() && i.name.endsWith('.md'))
    )

  return dirs.map(i => {
    const fullPath = join(dir, i.name, 'index.md')
    const content = fs.readFileSync(fullPath, 'utf8')
    const doc = matter(content)

    const tags = doc.data.tags ? (doc.data.tags as string[]) : []
    const keywords = doc.data.keywords ? (doc.data.keywords as string[]) : []
    const speakers = doc.data.speakers
      ? (doc.data.speakers.map((i: string) => slugify(i.toLowerCase(), { strict: true })) as string[])
      : []
    ExportSpeakersFromSession(doc.data.speakers)

    let session: any = {
      id: i.name,
      sourceId: doc.data.sourceId || i.name,
      eventId: `devcon-${doc.data.edition}`,
      title: doc.data.title,
      description: doc.data.description,
      track: doc.data.track,
      type: doc.data.type,
      expertise: doc.data.expertise,
      tags: [...new Set([...tags, ...keywords])],
      speakers: speakers,
    }

    if (doc.data.slidesUrl) {
      session.resources_slides = doc.data.slidesUrl
    }

    const scheduledSession = data.find((i: any) => i.id === session.sourceId)
    if (scheduledSession) {
      // console.log('SCHEDULED SESSION', scheduledSession)
      session.slot_start = scheduledSession.start
      session.slot_end = scheduledSession.end
      session.slot_roomId = scheduledSession.room.id
    }

    if (doc.data.youtubeUrl) session.sources_youtubeId = getVideoId(doc.data.youtubeUrl)
    if (doc.data.ipfsHash) session.sources_ipfsHash = doc.data.ipfsHash
    if (doc.data.ethernaPermalink)
      session.sources_swarmHash = doc.data.ethernaPermalink.replace('https://etherna.io/embed/', '')
    if (doc.data.duration) session.duration = doc.data.duration
    session.language = 'en'

    // fix duplicate titles at other events 
    let filename = session.id
    if (filename === 'the-raiden-network' || filename === 'evolving-the-evm' || filename === 'state-of-the-ens') { 
      const newId = `${filename}-${id}`
      filename = newId
      session.id = newId
      session.sourceId = newId
    }

    // write session to file
    const sessionPath = join(process.cwd(), 'export', session.eventId, `${filename}.json`)
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2))
    return session
  })
}
