import type { NextApiRequest, NextApiResponse } from 'next'
import { checkAvAuth } from 'utils/adminAuth'
import { AV_SCREEN_SIZE_SET, cardFileName, cardRenderKey, isSessionCode } from 'services/av/av-assets'
import type { CardInputs } from 'services/av/render'
import { avGetJson } from 'services/av/storage'
import {
  AV_EVENT_FOLDER,
  INTRO_FOLDER,
  IRL_INTRO_FOLDER,
  avDayFolder,
  avRoomFolder,
  avRootFolderId,
  copySeed,
  driveList,
  driveViewLink,
  ensureFolderPath,
  introVideoName,
  openResumableUpload,
  trashFile,
  videoSeedId,
} from 'services/av/google-drive'

/**
 * Where a stream intro rendered on the AV page goes: the AV team's Drive,
 * in the session's day folder next to the renderer's own intros
 * (`Intro Animation` for 1920x1080, `IRL Intro Animation` for a stage
 * screen size), as `HH.mm <Title> [CODE] (WxH) v<N>.mp4` where N counts the
 * page's renders of that session and size, so every render is a new file
 * and the newest version is plain from the name.
 *
 * The file is created here as a copy of the Public video seed (it keeps the
 * Public label, which a fresh upload by the service account would not), and
 * the browser then sends the bytes straight to Drive through the resumable
 * session returned (a function body is capped at 6 MB). The card the video
 * was rendered from is recorded on the file, so the page can tell a current
 * video from an outdated one.
 *
 * POST { code, kind, width, height, inputs, card, size } -> { uploadUrl, fileId, name, version, link, savedAt }
 * DELETE { code, fileId }: the browser's upload failed, trash the copy so no placeholder holds that version.
 */
const INPUTS = /^[a-f0-9]{16}$/
const MAX_BYTES = 400 * 1024 * 1024

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store')
  if (!checkAvAuth(req, res)) return
  if (req.method === 'DELETE') return abandon(req, res)
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'method not allowed' })
  const code = String(req.body?.code || '').toUpperCase()
  const kind = req.body?.kind as 'YouTube' | 'Screen'
  const width = Number(req.body?.width)
  const height = Number(req.body?.height)
  const inputs = String(req.body?.inputs || '')
  const size = Number(req.body?.size)
  const card = typeof req.body?.card === 'string' ? req.body.card : ''
  if (!isSessionCode(code)) return res.status(400).json({ success: false, error: 'invalid session code' })
  const sizeKey = `${width}x${height}`
  const sizeOk =
    Number.isInteger(width) &&
    Number.isInteger(height) &&
    ((kind === 'YouTube' && sizeKey === '1920x1080') || (kind === 'Screen' && AV_SCREEN_SIZE_SET.has(sizeKey)))
  if (!sizeOk) return res.status(400).json({ success: false, error: 'unknown video kind or size' })
  if (!INPUTS.test(inputs)) return res.status(400).json({ success: false, error: 'missing session data hash' })
  if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES)
    return res.status(400).json({ success: false, error: 'invalid video size' })
  try {
    const data = await avGetJson<CardInputs>(`inputs/${code}/${inputs}.json`)
    const session = data?.session
    if (!session) return res.status(410).json({ success: false, error: 'the session data behind this page has expired, open the session again' })
    if (!session.slot_start || !session.slot_room?.name)
      return res.status(400).json({ success: false, error: 'the session has no stage or time in Pretalx yet, so it has no Drive folder' })

    const folderId = await ensureFolderPath(avRootFolderId(), [
      AV_EVENT_FOLDER,
      avRoomFolder(session.slot_room.name),
      avDayFolder(session.slot_start),
      kind === 'YouTube' ? INTRO_FOLDER : IRL_INTRO_FOLDER,
    ])
    const previous = await driveList(
      `'${folderId}' in parents and trashed = false and appProperties has { key='source' and value='av-page' } and appProperties has { key='code' and value='${code}' } and appProperties has { key='size' and value='${sizeKey}' }`
    )
    const version = previous.reduce((max, f) => Math.max(max, Number(f.appProperties?.version) || 0), 0) + 1
    const name = introVideoName(
      cardFileName({ code: session.sourceId ?? code, title: session.title, start: session.slot_start }, kind, width, height),
      width,
      height,
      version
    )
    const savedAt = Date.now()
    const file = await copySeed(
      await videoSeedId(),
      folderId,
      name,
      { source: 'av-page', code, kind, size: sizeKey, version: String(version), card: cardRenderKey(card), savedAt: String(savedAt) },
      `Stream intro rendered on the AV page (devcon.org/av) on ${new Date(savedAt).toISOString()}${card ? ` from the card ${card}` : ''}.`
    )
    // The upload session is opened for the page's own origin only: the request's Origin header must be
    // this host (or a local dev server), never an arbitrary value the caller chooses.
    const host = String(req.headers.host || '')
    const sent = typeof req.headers.origin === 'string' ? req.headers.origin : ''
    const allowed = [`https://${host}`, `http://${host}`].includes(sent) || /^http:\/\/localhost(:\d+)?$/.test(sent)
    const origin = allowed ? sent : `https://${host}`
    const uploadUrl = await openResumableUpload(file.id, 'video/mp4', size, origin)
    return res.status(200).json({
      success: true,
      data: { uploadUrl, fileId: file.id, name, version, link: driveViewLink(file.id), savedAt },
    })
  } catch (error) {
    console.error(`[av] video upload for ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: (error as Error).message })
  }
}

/** Trash a copy whose upload never completed: only a file this page made for that session. */
async function abandon(req: NextApiRequest, res: NextApiResponse) {
  const code = String(req.body?.code || '').toUpperCase()
  const fileId = String(req.body?.fileId || '')
  if (!isSessionCode(code) || !/^[A-Za-z0-9_-]{10,80}$/.test(fileId))
    return res.status(400).json({ success: false, error: 'invalid session code or file id' })
  try {
    const [file] = await driveList(
      `appProperties has { key='source' and value='av-page' } and appProperties has { key='code' and value='${code}' } and trashed = false`,
      'id,name'
    ).then(files => files.filter(f => f.id === fileId))
    if (!file) return res.status(404).json({ success: false, error: 'no such file of this page for this session' })
    await trashFile(file.id)
    return res.status(200).json({ success: true, data: { trashed: file.name } })
  } catch (error) {
    console.error(`[av] abandon video ${fileId} for ${code} failed:`, (error as Error).message)
    return res.status(502).json({ success: false, error: (error as Error).message })
  }
}
