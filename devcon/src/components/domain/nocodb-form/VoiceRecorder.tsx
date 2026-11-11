import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square } from 'lucide-react'

/**
 * Voice input for "[voice]" long-text fields (config/form-field-markers): a
 * small mic button inside the text box's bottom-right corner (wrap the
 * textarea as `children`). A take is recorded with MediaRecorder, converted
 * to 16 kHz mono WAV in the browser (every recorder format decodes there, and
 * WAV is what the speech model accepts everywhere), sent to
 * /api/nocodb/{viewId}/transcribe/, and the text handed to `onText`. Where the
 * browser can't record, only the textarea shows.
 */

/** One take: 2 minutes of 16 kHz 16-bit mono WAV is ~3.8 MB, under the function payload limit. */
export const VOICE_MAX_SECONDS = 120
const MIN_SECONDS = 1
const SAMPLE_RATE = 16000
// Whisper invents words ("you", "Thank you.") for silence, so a take with less
// than this much sound above ~-44 dBFS (room noise is lower, quiet speech higher)
// is not sent.
const MIN_VOICED_SECONDS = 0.3
const VOICED_RMS = 0.006
// First supported wins: Chrome/Android record webm, Safari mp4, Firefox ogg.
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

type Status = 'idle' | 'starting' | 'recording' | 'transcribing'

interface Props {
  viewId: string
  onText: (text: string) => void
  disabled?: boolean
  /** The textarea the controls sit inside; give it right padding (pr-14) so text clears them. */
  children: React.ReactNode
}

/** The textarea placeholder for voice fields: the only hint the widget needs. */
export const VOICE_PLACEHOLDER = 'Type your answer, or tap the mic and talk it through.'

export function VoiceRecorder({ viewId, onText, disabled, children }: Props) {
  const [supported, setSupported] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onTextRef = useRef(onText)

  useEffect(() => {
    onTextRef.current = onText
  }, [onText])

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
    )
    // Leaving the page mid-take: drop the recording and release the mic.
    return () => {
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.onstop = null
        recorder.stop()
      }
      releaseMic()
    }
  }, [])

  function releaseMic() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }

  function stop() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  async function start() {
    setError(null)
    setStatus('starting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      const mimeType = MIME_TYPES.find(type => MediaRecorder.isTypeSupported(type))
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      const chunks: Blob[] = []
      const startedAt = Date.now()
      recorder.ondataavailable = event => {
        if (event.data.size) chunks.push(event.data)
      }
      recorder.onstop = () => {
        recorderRef.current = null
        releaseMic()
        if ((Date.now() - startedAt) / 1000 < MIN_SECONDS) {
          setStatus('idle')
          setError('That was too short. Tap record, talk, then tap stop.')
          return
        }
        void transcribe(new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' }))
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setElapsed(0)
      setStatus('recording')
      timerRef.current = setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000)
        setElapsed(seconds)
        if (seconds >= VOICE_MAX_SECONDS) stop()
      }, 250)
    } catch (err) {
      releaseMic()
      setStatus('idle')
      const name = (err as DOMException | undefined)?.name
      setError(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access is blocked. Allow it in your browser settings, or type your answer.'
          : name === 'NotFoundError'
            ? 'No microphone found. You can type your answer instead.'
            : 'Could not start recording. You can type your answer instead.'
      )
    }
  }

  async function transcribe(recording: Blob) {
    setStatus('transcribing')
    try {
      const { wav, voicedSeconds } = await toWav(recording)
      if (voicedSeconds < MIN_VOICED_SECONDS) {
        setError("We couldn't hear anything. Check your microphone and try again.")
        return
      }
      const headers: Record<string, string> = { 'Content-Type': 'audio/wav' }
      // A closed form's preview link (FormPage) unlocks transcription too.
      const preview = new URLSearchParams(window.location.search).get('preview')
      if (preview) headers['X-Form-Preview'] = preview
      const res = await fetch(`/api/nocodb/${viewId}/transcribe/`, { method: 'POST', headers, body: wav })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) throw new Error(json.error || 'Transcription failed. You can type your answer instead.')
      const text = typeof json.text === 'string' ? json.text.trim() : ''
      if (text) onTextRef.current(text)
      else setError("We couldn't make out any words. Try again a little closer to the mic.")
    } catch (err) {
      setError((err as Error).message || 'Transcription failed. You can type your answer instead.')
    } finally {
      setStatus('idle')
    }
  }

  if (!supported) return <>{children}</>

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        {children}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          {status === 'recording' ? (
            <button
              type="button"
              onClick={stop}
              aria-label={`Stop recording, ${clock(elapsed)} of ${clock(VOICE_MAX_SECONDS)}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#b42124] px-3 text-sm font-semibold tabular-nums text-white hover:bg-[#9a1c1f] transition-colors"
            >
              <Square className="w-3 h-3 fill-current" aria-hidden="true" />
              {clock(elapsed)}
            </button>
          ) : status === 'idle' ? (
            <button
              type="button"
              onClick={start}
              disabled={disabled}
              aria-label="Record your answer"
              title="Record your answer: talk it through, it turns into text you can edit"
              className="inline-flex size-9 items-center justify-center rounded-full text-[#7235ed] hover:bg-[#f4effe] disabled:opacity-60 disabled:hover:bg-transparent transition-colors"
            >
              <Mic className="w-5 h-5" aria-hidden="true" />
            </button>
          ) : (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-3 text-sm text-[#7235ed]">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              {status === 'transcribing' ? 'Turning it into text…' : 'Starting…'}
            </span>
          )}
        </div>
      </div>
      <span className="sr-only" aria-live="polite">
        {status === 'recording' ? 'Recording' : status === 'transcribing' ? 'Transcribing' : ''}
      </span>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/**
 * Decode whatever the recorder produced and re-encode it as 16 kHz mono 16-bit
 * WAV, measuring how much of it carries sound (30 ms frames above VOICED_RMS).
 */
async function toWav(recording: Blob): Promise<{ wav: Blob; voicedSeconds: number }> {
  const AudioCtx: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const context = new AudioCtx()
  let decoded: AudioBuffer
  try {
    decoded = await context.decodeAudioData(await recording.arrayBuffer())
  } finally {
    void context.close()
  }
  const frames = Math.max(1, Math.ceil(decoded.duration * SAMPLE_RATE))
  const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const samples = (await offline.startRendering()).getChannelData(0)

  const frame = Math.round(SAMPLE_RATE * 0.03)
  let voicedFrames = 0
  for (let start = 0; start + frame <= samples.length; start += frame) {
    let sum = 0
    for (let i = start; i < start + frame; i++) sum += samples[i] * samples[i]
    if (Math.sqrt(sum / frame) > VOICED_RMS) voicedFrames++
  }

  const view = new DataView(new ArrayBuffer(44 + samples.length * 2))
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  ascii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  ascii(8, 'WAVE')
  ascii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  ascii(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return { wav: new Blob([view], { type: 'audio/wav' }), voicedSeconds: voicedFrames * 0.03 }
}
