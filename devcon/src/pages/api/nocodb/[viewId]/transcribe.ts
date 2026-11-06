import type { NextApiRequest, NextApiResponse } from 'next'
import { getFormConfigByViewId, isFormOpen, isPreviewAllowed } from 'services/form-config'
import { getTableFields } from 'services/nocodb'
import { isVoiceTitle } from 'config/form-field-markers'
import { getClientIp } from 'utils/getClientIp'

/**
 * POST a WAV recording (body `audio/wav`, from VoiceRecorder) -> { success, text }.
 *
 * Speech-to-text for "[voice]" long-text fields, through the EF inference
 * server's OpenAI-compatible transcription endpoint (full URL in
 * EF_INFERENCE_AUDIO_URL, key in EF_INFERENCE_AUDIO_API_KEY). Only forms that have a
 * voice field and are open (or opened with their preview password, header
 * `X-Form-Preview`) can use it, so the route is not a general transcription
 * proxy. The audio is forwarded and never stored.
 */

export const config = { api: { bodyParser: false } }

// The EF server's transcription alias, so the model behind it can change
// without a deploy (Whisper large-v3 as of 2026-11-06: Indian English and Hindi
// come back accurate in a few seconds). The prompt is a spelling hint; without
// it "Devcon" comes back as "DEF CON".
const MODEL = 'ef-meeting-transcribe'
const PROMPT = 'Devcon, Ethereum.'
// A 2-minute take (VOICE_MAX_SECONDS) is ~3.8 MB; leave some room.
const MAX_BYTES = 4.5 * 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 25_000

// Best-effort per-IP throttle (per function instance): a long answer takes a
// few takes, so this only stops a script from using the route as free speech-to-text.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 30
const recent = new Map<string, number[]>()

function throttled(ip: string): boolean {
  const now = Date.now()
  const hits = (recent.get(ip) ?? []).filter(t => now - t < WINDOW_MS)
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(ip, hits)
    return true
  }
  hits.push(now)
  recent.set(ip, hits)
  if (recent.size > 5000) {
    for (const [key, times] of recent) if (!times.some(t => now - t < WINDOW_MS)) recent.delete(key)
  }
  return false
}

async function readBody(req: NextApiRequest, limit: number): Promise<Buffer | null> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer)
    size += buf.length
    if (size > limit) return null
    chunks.push(buf)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).setHeader('Allow', 'POST').end()
  }
  const { viewId } = req.query
  if (typeof viewId !== 'string') {
    return res.status(400).json({ success: false, error: 'Invalid viewId' })
  }
  const endpoint = process.env.EF_INFERENCE_AUDIO_URL
  const apiKey = process.env.EF_INFERENCE_AUDIO_API_KEY
  if (!endpoint || !apiKey) {
    return res.status(503).json({ success: false, error: 'Voice answers are not available right now. Please type your answer.' })
  }
  if (!String(req.headers['content-type'] || '').startsWith('audio/wav')) {
    return res.status(415).json({ success: false, error: 'Expected a WAV recording' })
  }

  try {
    const fields = await getTableFields(viewId)
    if (!fields.some(f => isVoiceTitle(f.title))) {
      return res.status(404).json({ success: false, error: 'This form has no voice answers' })
    }
    const formConfig = await getFormConfigByViewId(viewId)
    const preview = req.headers['x-form-preview']
    if (formConfig && !isFormOpen(formConfig) && !(await isPreviewAllowed(viewId, Array.isArray(preview) ? preview[0] : preview))) {
      return res.status(403).json({ success: false, error: 'This form is no longer accepting submissions.' })
    }
    if (throttled(getClientIp(req))) {
      return res.status(429).json({ success: false, error: 'Too many recordings in a short time. Please type your answer or try again later.' })
    }

    const audio = await readBody(req, MAX_BYTES)
    if (!audio) {
      return res.status(413).json({ success: false, error: 'That recording is too long. Keep each take under 2 minutes.' })
    }
    if (audio.length <= 44) {
      return res.status(400).json({ success: false, error: 'The recording was empty. Please try again.' })
    }

    const body = new FormData()
    body.append('model', MODEL)
    body.append('prompt', PROMPT)
    body.append('file', new Blob([new Uint8Array(audio)], { type: 'audio/wav' }), 'answer.wav')
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
    if (!upstream.ok) {
      const detail = (await upstream.text().catch(() => '')).slice(0, 300)
      const cause = upstream.status === 401 || upstream.status === 403 ? 'EF_INFERENCE_AUDIO_API_KEY rejected' : 'speech-to-text failed'
      console.error(`[nocodb/transcribe] ${cause} (HTTP ${upstream.status}):`, detail)
      return res.status(502).json({ success: false, error: 'Transcription failed. Please try again or type your answer.' })
    }
    const json = (await upstream.json()) as { text?: unknown }
    const text = typeof json.text === 'string' ? json.text.trim() : ''
    return res.status(200).json({ success: true, text })
  } catch (err) {
    console.error('[nocodb/transcribe] error:', err)
    return res.status(500).json({ success: false, error: 'Transcription failed. Please try again or type your answer.' })
  }
}
