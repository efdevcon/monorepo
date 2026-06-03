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
export const PRESET_DIRS = ['characters', 'characters-plain', 'profiles'] as const
export type PresetDir = (typeof PRESET_DIRS)[number]

fsSync.mkdirSync(RUNS_DIR, { recursive: true })

export type LabModel = 'openai'
export type LabQuality = 'auto' | 'low' | 'medium' | 'high'

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
  referenceCount?: number
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
  // Optional style-reference images. When present they're passed as
  // additional inputs to the edit call (subject image first, references
  // after) so the model applies their art style to the subject.
  references: Array<{ base64: string; mime: string }> = [],
): Promise<Buffer> {
  if (model !== 'openai') {
    throw new Error(`Unsupported model: ${model}`)
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const ext = srcMime.split('/')[1] || 'png'
  const form = new FormData()
  form.set('model', 'gpt-image-2-2026-04-21')
  form.set('prompt', prompt)
  form.set('quality', quality)
  form.set('size', '1024x1024')
  const subjectBlob = new Blob([Buffer.from(srcBase64, 'base64')], { type: srcMime })
  if (references.length === 0) {
    // Single-image form — known-good path.
    form.set('image', subjectBlob, `source.${ext}`)
  } else {
    // Multi-image: subject first, then style references. OpenAI's images.edit
    // takes the array via repeated `image[]` parts.
    form.append('image[]', subjectBlob, `source.${ext}`)
    references.forEach((ref, i) => {
      const refExt = ref.mime.split('/')[1] || 'png'
      form.append('image[]', new Blob([Buffer.from(ref.base64, 'base64')], { type: ref.mime }), `ref-${i}.${refExt}`)
    })
  }

  // Generous client-side timeout so a true timeout is distinguishable from a
  // remote socket reset (UND_ERR_SOCKET) or DNS failure.
  const controller = new AbortController()
  const timeoutMs = 5 * 60 * 1000
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: form,
      signal: controller.signal,
    })
  } catch (err) {
    const cause = (err as any)?.cause
    const causeBits = [
      cause?.code,
      cause?.message,
      cause?.errno && `errno=${cause.errno}`,
    ]
      .filter(Boolean)
      .join(' / ')
    const aborted = controller.signal.aborted
    console.error('[avatar-lab] OpenAI fetch failed', {
      message: (err as Error).message,
      cause,
      aborted,
    })
    throw new Error(
      `OpenAI request failed: ${(err as Error).message}` +
        (aborted ? ` (aborted after ${timeoutMs / 1000}s timeout)` : '') +
        (causeBits ? ` — ${causeBits}` : ''),
    )
  } finally {
    clearTimeout(timeoutHandle)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = (await res.json()) as { data?: Array<{ b64_json?: string }> }
  const b64 = data?.data?.[0]?.b64_json
  if (!b64) throw new Error('No image in OpenAI response')
  return Buffer.from(b64, 'base64')
}

// Forces the vision model to describe transferable STYLE only — never the
// subject/content of the reference. The "brief a painter who paints something
// else" framing is what abstracts away from the specific picture, so the
// result generalizes across source photos instead of trying to copy the ref.
const STYLE_EXTRACTION_PROMPT = `You are an art-direction analyst. The attached image(s) share a single visual style. Describe ONLY their common transferable STYLE — never their subject, content, characters, or composition.

Output these sections as terse comma-separated clauses I can paste directly into an image-generation prompt:

1. RENDERING: medium, brushwork, line quality, texture, grain, sharpness
2. PALETTE: dominant hues, accent hues, value range, saturation (name actual colors)
3. LIGHT: light quality, direction, glow, contrast
4. MOOD: 3-5 adjectives
5. ANTI-PATTERNS: what this style is NOT (e.g. "not hyper-sharp, not photoreal")

Forbidden: do not mention any person, object, scene, or layout in the images. Describe technique and atmosphere only, as if briefing a painter who will paint something completely different in the same style. Synthesize across all images into ONE coherent style description. Keep the whole response under 200 words.`

/**
 * Runs one or more reference images through a vision model and returns a
 * single distilled, paste-ready description of their shared transferable
 * style. Used by the avatar-lab's style-extractor so operators can fold the
 * reference artwork's "essence" into the prompt as words rather than feeding
 * the images as edit references (which makes gpt-image copy content and
 * produces inconsistent results).
 */
export async function extractStyle(images: Array<{ base64: string; mime: string }>): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }
  if (images.length === 0) {
    throw new Error('At least one reference image is required')
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 700,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: STYLE_EXTRACTION_PROMPT },
            ...images.map(img => ({
              type: 'image_url' as const,
              image_url: { url: `data:${img.mime};base64,${img.base64}` },
            })),
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI ${res.status}: ${text.slice(0, 500)}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data?.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('No style description in OpenAI response')
  return content
}

export function newRunId(): string {
  return `${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}-${randomUUID().slice(0, 6)}`
}
