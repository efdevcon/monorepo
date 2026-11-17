import { JWT } from 'google-auth-library'

/**
 * Video lengths from the YouTube Data API (videos.list, contentDetails), read
 * with the Google service account (GOOGLE_CLIENT_EMAIL / GOOGLE_PRIVATE_KEY,
 * or their GOOGLE_CLOUD_ variants). It keeps its own auth client rather than
 * `google.options`, so a lookup never swaps the credentials other Google
 * clients in the same process use.
 */

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']
/** videos.list takes at most 50 ids per call. */
const BATCH = 50
const TIMEOUT_MS = 8000

let client: JWT | null = null

function auth(): JWT | null {
  const email = process.env.GOOGLE_CLOUD_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL
  const key = (process.env.GOOGLE_CLOUD_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n')
  if (!email || !key) return null
  return (client ??= new JWT({ email, key, scopes: SCOPES }))
}

/** "PT1H2M3S" -> 3723 seconds (YouTube's ISO 8601 durations; days only for very long streams). */
export function parseISO8601Duration(duration: string): number {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/)
  if (!match) return 0
  const [, days, hours, minutes, seconds] = match.map((v) => parseInt(v || '0', 10))
  return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

/**
 * Seconds per YouTube video id. Ids YouTube doesn't return (deleted or
 * private videos) are absent from the map. Throws without credentials or when
 * the API refuses.
 */
export async function fetchYoutubeDurations(ids: string[]): Promise<Map<string, number>> {
  const jwt = auth()
  if (!jwt) throw new Error('no Google service account credentials')
  const durations = new Map<string, number>()
  const unique = [...new Set(ids.filter(Boolean))]
  for (let i = 0; i < unique.length; i += BATCH) {
    const batch = unique.slice(i, i + BATCH)
    const res = await jwt.request<{ items?: { id: string; contentDetails?: { duration?: string } }[] }>({
      url: `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&maxResults=${BATCH}&id=${batch.map(encodeURIComponent).join(',')}`,
      timeout: TIMEOUT_MS,
    })
    for (const item of res.data.items ?? []) {
      const seconds = parseISO8601Duration(item.contentDetails?.duration ?? '')
      if (seconds > 0) durations.set(item.id, seconds)
    }
  }
  return durations
}

/** One video's length in seconds, or null when it can't be read (logged, never thrown). */
export async function youtubeDuration(id: string): Promise<number | null> {
  try {
    return (await fetchYoutubeDurations([id])).get(id) ?? null
  } catch (err) {
    console.warn(`YouTube duration lookup failed for ${id}:`, err instanceof Error ? err.message : err)
    return null
  }
}
