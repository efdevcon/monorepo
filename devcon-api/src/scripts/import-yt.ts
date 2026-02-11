import dotenv from 'dotenv'
dotenv.config()

import fs from 'fs'
import path from 'path'
import { AuthenticateServiceAccount } from '@/clients/google'
import { defaultSlugify } from '@/utils/content'

const DATA_DIR = path.resolve(__dirname, '../../data')

interface PlaylistEntry {
  name: string
  url: string
}

interface SessionData {
  id: string
  sourceId: string
  eventId: string
  title: string
  description: string
  track: string
  type: string
  expertise: string
  tags: string[]
  speakers: string[]
  sources_youtubeId: string
  duration: number
  language: string
}

function parseISO8601Duration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)
  return hours * 3600 + minutes * 60 + seconds
}

async function fetchPlaylistItems(youtube: any, playlistId: string) {
  const items: any[] = []
  let pageToken: string | undefined

  do {
    const res = await youtube.playlistItems.list({
      part: 'snippet',
      playlistId,
      maxResults: 50,
      pageToken,
    })
    items.push(...(res.data.items || []))
    pageToken = res.data.nextPageToken
  } while (pageToken)

  return items
}

async function fetchVideoDurations(youtube: any, videoIds: string[]): Promise<Map<string, number>> {
  const durations = new Map<string, number>()

  // YouTube API allows max 50 IDs per request
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50)
    const res = await youtube.videos.list({
      part: 'contentDetails',
      id: batch.join(','),
    })
    for (const item of res.data.items || []) {
      durations.set(item.id, parseISO8601Duration(item.contentDetails.duration))
    }
  }

  return durations
}

function ensureEventFile(eventId: string) {
  const eventFile = path.join(DATA_DIR, 'events', `${eventId}.json`)
  if (!fs.existsSync(eventFile)) {
    const skeleton = {
      edition: 0,
      title: eventId,
      description: '',
      location: '',
      startDate: '',
      endDate: '',
      venue_name: '',
      venue_description: '',
      venue_address: '',
      venue_website: '',
      venue_directions: '',
      rooms: [],
      version: '1.0',
    }
    fs.writeFileSync(eventFile, JSON.stringify(skeleton, null, 2) + '\n')
    console.log(`Created event skeleton: ${eventFile}`)
  }
}

function deduplicateSlug(slug: string, dir: string): string {
  if (!fs.existsSync(path.join(dir, `${slug}.json`))) return slug

  let counter = 2
  while (fs.existsSync(path.join(dir, `${slug}-${counter}.json`))) {
    counter++
  }
  return `${slug}-${counter}`
}

function extractPlaylistId(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get('list')
  } catch {
    return null
  }
}

function extractVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.searchParams.get('v')
  } catch {
    return null
  }
}

async function fetchSingleVideo(youtube: any, videoId: string) {
  const res = await youtube.videos.list({
    part: 'snippet,contentDetails',
    id: videoId,
  })
  return res.data.items?.[0] || null
}

async function main() {
  const eventId = 'devconnect-arg'
  const playlistsPath = path.join(DATA_DIR, 'playlists.json')
  const playlists: PlaylistEntry[] = JSON.parse(fs.readFileSync(playlistsPath, 'utf-8'))

  const google = await AuthenticateServiceAccount(['https://www.googleapis.com/auth/youtube.readonly'])
  const youtube = google.youtube('v3')

  const sessionDir = path.join(DATA_DIR, 'sessions', eventId)
  fs.mkdirSync(sessionDir, { recursive: true })
  ensureEventFile(eventId)

  let totalImported = 0
  let totalSkipped = 0

  for (const entry of playlists) {
    const playlistId = extractPlaylistId(entry.url)
    const videoId = extractVideoId(entry.url)

    if (playlistId) {
      console.log(`Fetching playlist "${entry.name}" (${playlistId})...`)
      const items = await fetchPlaylistItems(youtube, playlistId)
      console.log(`  Found ${items.length} videos`)

      const videoIds = items
        .map((item: any) => item.snippet?.resourceId?.videoId)
        .filter(Boolean) as string[]

      const durations = await fetchVideoDurations(youtube, videoIds)

      for (const item of items) {
        const vid = item.snippet?.resourceId?.videoId
        if (!vid) continue

        const title = item.snippet.title || 'Untitled'
        const slug = defaultSlugify(title)
        if (!slug) continue

        const finalSlug = deduplicateSlug(slug, sessionDir)
        const filePath = path.join(sessionDir, `${finalSlug}.json`)

        if (fs.existsSync(filePath) && finalSlug === slug) {
          totalSkipped++
          continue
        }

        const session: SessionData = {
          id: finalSlug,
          sourceId: vid,
          eventId,
          title,
          description: item.snippet.description || '',
          track: entry.name,
          type: 'Talk',
          expertise: '',
          tags: [],
          speakers: [],
          sources_youtubeId: vid,
          duration: durations.get(vid) || 0,
          language: 'en',
        }

        fs.writeFileSync(filePath, JSON.stringify(session, null, 2) + '\n')
        totalImported++
      }
    } else if (videoId) {
      console.log(`Fetching single video "${entry.name}" (${videoId})...`)
      const video = await fetchSingleVideo(youtube, videoId)
      if (!video) {
        console.warn(`  Could not fetch video ${videoId}`)
        continue
      }

      const title = video.snippet.title || 'Untitled'
      const slug = defaultSlugify(title)
      if (!slug) continue

      const finalSlug = deduplicateSlug(slug, sessionDir)
      const filePath = path.join(sessionDir, `${finalSlug}.json`)

      if (fs.existsSync(filePath) && finalSlug === slug) {
        totalSkipped++
        continue
      }

      const session: SessionData = {
        id: finalSlug,
        sourceId: videoId,
        eventId,
        title,
        description: video.snippet.description || '',
        track: entry.name,
        type: 'Talk',
        expertise: '',
        tags: [],
        speakers: [],
        sources_youtubeId: videoId,
        duration: parseISO8601Duration(video.contentDetails.duration),
        language: 'en',
      }

      fs.writeFileSync(filePath, JSON.stringify(session, null, 2) + '\n')
      totalImported++
    } else {
      console.warn(`Skipping "${entry.name}": could not extract playlist or video ID from ${entry.url}`)
    }
  }

  console.log(`\nDone! Imported: ${totalImported}, Skipped (existing): ${totalSkipped}`)
}

main().catch((err) => {
  console.error('Import failed:', err)
  process.exit(1)
})
