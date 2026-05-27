/**
 * Avatar Prompt Lab — server-side helpers.
 *
 * Admin-only tool for iterating on avatar-generation prompts. Every batch is
 * saved to disk under `avatar-lab-runs/` so the operator can compare iterations
 * side-by-side. NOT the production avatar flow — see the devcon-ai service for
 * the user-facing generator.
 */
import fs from 'fs/promises'
import fsSync from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// Dev-only tool. Disabled on production builds so it never ships when the
// branch deploys. Local `pnpm dev` runs with NODE_ENV=development.
export function isLabEnabled(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export const RUNS_DIR = path.join(process.cwd(), 'avatar-lab-runs')
export const REFS_DIR = path.join(process.cwd(), 'public', 'avatar-lab-refs')
export const PRESET_DIRS = ['characters', 'characters-plain'] as const
export type PresetDir = (typeof PRESET_DIRS)[number]

fsSync.mkdirSync(RUNS_DIR, { recursive: true })

export type LabModel = 'openai'
export type LabQuality = 'low' | 'medium' | 'high'

export interface RunOutput {
  sourceFile: string
  outputFile: string | null
  error?: string
  sourceLabel: string
  durationMs: number
}

export interface RunMeta {
  createdAt: string
  model: LabModel
  quality: LabQuality
  prompt: string
  label?: string
  outputs: RunOutput[]
}

export type Source =
  | { kind: 'preset'; dir: PresetDir; name: string }
  | { kind: 'upload'; name: string; data: string }

export function safePart(s: string): boolean {
  return !s.includes('..') && !s.includes('/') && !s.includes('\\')
}

export function safeSlug(name: string): string {
  return name.replace(/[^a-z0-9.-]+/gi, '_').slice(0, 80)
}

export function mimeFromFilename(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (lower.endsWith('.webp')) return 'image/webp'
  return 'image/png'
}

function detectMimeFromBase64(b64: string): string {
  if (b64.startsWith('iVBORw0KGgo')) return 'image/png'
  if (b64.startsWith('/9j/')) return 'image/jpeg'
  if (b64.startsWith('UklGR')) return 'image/webp'
  return 'image/png'
}

export async function resolveSource(src: Source): Promise<{ base64: string; mime: string; label: string }> {
  if (src.kind === 'preset') {
    if (!safePart(src.name) || !(PRESET_DIRS as readonly string[]).includes(src.dir)) {
      throw new Error('Invalid preset path')
    }
    const filePath = path.join(REFS_DIR, src.dir, src.name)
    const buf = await fs.readFile(filePath)
    return {
      base64: buf.toString('base64'),
      mime: mimeFromFilename(src.name),
      label: `${src.dir}/${src.name}`,
    }
  }
  const clean = src.data.replace(/^data:image\/[a-z]+;base64,/, '')
  return { base64: clean, mime: detectMimeFromBase64(clean), label: src.name }
}

// Raw HTTP against OpenAI's images/edits endpoint. We bypass the installed
// `openai` SDK because devcon's pinned version (4.95.1) predates the
// gpt-image-1 type support. This admin tool is local-only and the dependency
// upgrade isn't worth churning the other openai consumers in this repo.
export async function generateImage(
  model: LabModel,
  srcBase64: string,
  srcMime: string,
  prompt: string,
  quality: LabQuality,
): Promise<Buffer> {
  if (model !== 'openai') {
    throw new Error(`Unsupported model: ${model}`)
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const ext = srcMime.split('/')[1] || 'png'
  const form = new FormData()
  form.set('model', 'gpt-image-1')
  form.set('prompt', prompt)
  form.set('quality', quality)
  form.set('size', '1024x1024')
  form.set(
    'image',
    new Blob([Buffer.from(srcBase64, 'base64')], { type: srcMime }),
    `source.${ext}`,
  )

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> }
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw new Error('No image in OpenAI response')
  return Buffer.from(b64, 'base64')
}

export function newRunId(): string {
  return `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${randomUUID().slice(0, 6)}`
}
