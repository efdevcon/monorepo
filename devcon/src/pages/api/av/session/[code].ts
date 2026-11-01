import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { isSessionCode } from 'services/av/av-assets'
import { getAvSession, type AvStoredVideo } from 'services/av/pretalx'
import { prepareCardInputs } from 'services/av/render'
import { driveList, driveViewLink } from 'services/av/google-drive'

// One session for the AV page, read fresh from Pretalx on every call. The same call prepares the
// card renders' inputs (the session in the card's shape plus every speaker photo, stored once in
// the av-assets bucket) and returns their hash as `inputs`, so the six card renders that follow
// read that file instead of each going to Pretalx. When storage is down, `inputs` is null and the
// page renders the old way (bytes straight from Pretalx), so a storage incident costs speed only.
// `videos` lists the stream intros the page saved to the AV team's Drive for this session (newest
// version per kind and size, with the card each was made from), so the page shows them without
// a render. A Drive hiccup leaves it empty: the page then offers to make the video.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Password-gated (AV_PASSWORD): never cached by the CDN, whose cache key ignores the header.
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'method not allowed' })
  const code = String(req.query.code || '').toUpperCase()
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  try {
    const [session, inputs, videos] = await Promise.all([
      getAvSession(code),
      prepareCardInputs(code).catch(error => {
        console.error(`[av] inputs for ${code} not prepared:`, (error as Error).message)
        return null
      }),
      storedVideos(code).catch(error => {
        console.error(`[av] stored videos for ${code} not listed:`, (error as Error).message)
        return {} as Record<string, AvStoredVideo>
      }),
    ])
    if (!session) return res.status(404).json({ success: false, error: `no accepted or confirmed session ${code}` })
    return res.status(200).json({ success: true, data: { ...session, inputs, videos } })
  } catch (error) {
    console.error(`[av] session ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: 'could not read the session from Pretalx' })
  }
}

/** The page's own intros for this session in Drive, newest version per `<Kind>-<w>x<h>`. */
async function storedVideos(code: string): Promise<Record<string, AvStoredVideo>> {
  const files = await driveList(
    `appProperties has { key='source' and value='av-page' } and appProperties has { key='code' and value='${code}' } and trashed = false`,
    'id,name,modifiedTime,appProperties'
  )
  const videos: Record<string, AvStoredVideo> = {}
  for (const f of files) {
    const p = f.appProperties ?? {}
    if (!p.kind || !p.size) continue
    const key = `${p.kind}-${p.size}`
    const version = Number(p.version) || 0
    if (videos[key] && (videos[key].version ?? 0) >= version) continue
    videos[key] = {
      exists: true,
      fileId: f.id,
      name: f.name,
      version,
      link: driveViewLink(f.id),
      card: p.card || undefined,
      savedAt: Number(p.savedAt) || Date.parse(f.modifiedTime || '') || undefined,
    }
  }
  return videos
}
