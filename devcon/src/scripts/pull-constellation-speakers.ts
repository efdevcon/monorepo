/**
 * Pull the hand-curated Devcon 8 "Confirmed speakers" from Pretalx into the
 * home page living-constellation component:
 *
 *   portraits      → src/components/domain/landing-page/living-constellation/assets/portraits/<slug>.webp
 *   profile fields → src/components/domain/landing-page/living-constellation/speakers.generated.ts
 *
 * Curation (who is listed, order, title, colour, overrides) lives in
 * speakers-allowlist.ts and is never touched here. Pretalx supplies name,
 * avatar, organization (question 153) and X handle (question 142); it has no
 * job-title question, so the bio is printed to help fill `title` by hand.
 *
 * Usage:
 *   pnpm speakers:pull                     # fetch, normalise avatars, rewrite the generated file
 *   pnpm speakers:pull --force             # re-download avatars even when the file already exists
 *   pnpm speakers:pull --dry-run           # print what would change, write nothing
 *   pnpm speakers:pull --normalize-manual  # also crop/convert hand-supplied portraits (manual entries and
 *                                          # `portrait:` overrides) to 720×720 webp, in place
 *   pnpm speakers:pull --prune             # delete portraits no allowlisted speaker references (default: list only,
 *                                          # so a portrait dropped in ahead of its allowlist entry survives)
 *
 * Requires PRETALX_API_KEY (team token for cfp.devcon.org) in .env.local or the
 * shell env. Running twice must produce no diff: sorted output + prettier +
 * deterministic sharp encoding.
 */
import { config as loadEnv } from 'dotenv'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import slugify from 'slugify'
import {
  SPEAKER_ALLOWLIST,
  allowlistId,
  type AllowlistEntry,
  type ManualAllowlistEntry,
  type PretalxAllowlistEntry,
} from '../components/domain/landing-page/living-constellation/speakers-allowlist'

// dotenv 15 reads only `.env` by default; the devcon app keeps its secrets in `.env.local`.
loadEnv({ path: '.env.local' })
loadEnv()

// prettier 2.x ships no type declarations and @types/prettier is not installed;
// only the two calls used here are typed.
interface PrettierLike {
  resolveConfig(file: string): Promise<Record<string, unknown> | null>
  format(source: string, options: Record<string, unknown>): string
}
const prettier = require('prettier') as PrettierLike

const PRETALX_BASE = (process.env.PRETALX_BASE_URL || 'https://cfp.devcon.org/api').replace(/\/+$/, '')
const EVENT_SLUG = 'devcon8'
const QUESTION_ORGANIZATION = 153 // "What project or organization are you affiliated with?"
const QUESTION_X = 142 // "Twitter/X profile"

const COMPONENT_DIR = path.resolve('src/components/domain/landing-page/living-constellation')
const PORTRAITS_DIR = path.join(COMPONENT_DIR, 'assets/portraits')
const OUTPUT_FILE = path.join(COMPONENT_DIR, 'speakers.generated.ts')

const PORTRAIT_SIZE = 720
const LOW_RES_THRESHOLD = 400
const IMAGE_EXT = /\.(webp|jpe?g|png|avif)$/i

const args = new Set(process.argv.slice(2))
const FORCE = args.has('--force')
const DRY_RUN = args.has('--dry-run')
const NORMALIZE_MANUAL = args.has('--normalize-manual')
const PRUNE = args.has('--prune')

interface PretalxAnswer {
  answer: string | null
  question: number | { id: number }
  person?: string | null
  submission?: string | null
}

interface PretalxSpeaker {
  code: string
  name: string
  biography: string | null
  avatar_url?: string | null
  avatar?: string | null
  answers?: PretalxAnswer[]
}

interface PulledRecord {
  id: string
  name: string
  organization: string
  xHandle?: string
  portrait: string
  source: 'pretalx' | 'manual'
}

const errors: string[] = []
const warnings: string[] = []
const missingTitles: string[] = []
let downloaded = 0

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`Missing ${name}. Add it to devcon/.env.local (team token for ${PRETALX_BASE}).`)
    process.exit(1)
  }
  return value
}

const TOKEN = requireEnv('PRETALX_API_KEY')

async function fetchSpeaker(code: string): Promise<PretalxSpeaker | null> {
  const url = `${PRETALX_BASE}/events/${EVENT_SLUG}/speakers/${encodeURIComponent(
    code
  )}/?questions=all&expand=answers.question`
  const res = await fetch(url, { headers: { Authorization: `Token ${TOKEN}` } })
  if (res.status === 404) {
    errors.push(`${code}: not found in Pretalx event "${EVENT_SLUG}" — check the code in speakers-allowlist.ts`)
    return null
  }
  if (!res.ok) {
    errors.push(`${code}: Pretalx API error ${res.status} ${res.statusText}`)
    return null
  }
  return (await res.json()) as PretalxSpeaker
}

function answerFor(speaker: PretalxSpeaker, questionId: number): string | undefined {
  const match = (speaker.answers ?? []).find(a => {
    const id = typeof a.question === 'number' ? a.question : a.question?.id
    return id === questionId
  })
  const value = match?.answer?.trim()
  return value ? value : undefined
}

// Accepts a full X/Twitter URL, "@handle" or a bare handle; returns the bare handle.
function normalizeXHandle(raw: string | undefined, label: string): string | undefined {
  if (!raw) return undefined
  const fromUrl = raw.match(
    /^(?:https?:\/\/)?(?:www\.|mobile\.)?(?:x|twitter)\.com\/@?([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/i
  )
  if (fromUrl) return fromUrl[1]
  const bare = raw.match(/^@?([A-Za-z0-9_]{1,15})$/)
  if (bare) return bare[1]
  warnings.push(`${label}: could not parse X profile answer "${raw}" — set xHandle in the allowlist if wanted`)
  return undefined
}

function portraitFilename(name: string): string {
  return `${slugify(name, { lower: true, strict: true })}.webp`
}

async function normalizeImage(input: Buffer, label: string): Promise<Buffer> {
  const meta = await sharp(input).metadata()
  const shortSide = Math.min(meta.width ?? 0, meta.height ?? 0)
  if (shortSide && shortSide < LOW_RES_THRESHOLD) {
    warnings.push(
      `${label}: source avatar is only ${meta.width}×${meta.height} — consider supplying a better portrait via \`portrait:\``
    )
  }
  return sharp(input)
    .rotate()
    .resize(PORTRAIT_SIZE, PORTRAIT_SIZE, {
      fit: 'cover',
      position: sharp.strategy.attention,
      withoutEnlargement: true,
    })
    .webp({ quality: 82 })
    .toBuffer()
}

async function downloadPortrait(speaker: PretalxSpeaker, filename: string): Promise<boolean> {
  const avatarUrl = speaker.avatar_url || speaker.avatar
  if (!avatarUrl) {
    errors.push(`${speaker.code} ${speaker.name}: no avatar in Pretalx — add \`portrait:\` to the allowlist entry`)
    return false
  }
  const target = path.join(PORTRAITS_DIR, filename)
  if (fs.existsSync(target) && !FORCE) return true

  downloaded++
  if (DRY_RUN) {
    console.log(`  ↓ would download ${filename} from ${avatarUrl}`)
    return true
  }

  // Avatars are public media; only present the team token to the Pretalx
  // origin itself, never to a CDN/object-storage host it might redirect to.
  const sameOrigin = new URL(avatarUrl).origin === new URL(PRETALX_BASE).origin
  const res = await fetch(avatarUrl, sameOrigin ? { headers: { Authorization: `Token ${TOKEN}` } } : undefined)
  if (!res.ok) {
    errors.push(`${speaker.code} ${speaker.name}: avatar download failed (${res.status}) from ${avatarUrl}`)
    return false
  }
  const buffer = await normalizeImage(Buffer.from(await res.arrayBuffer()), `${speaker.code} ${speaker.name}`)
  fs.writeFileSync(target, buffer)
  console.log(`  ↓ downloaded ${filename} (${Math.round(buffer.length / 1024)} KB)`)
  return true
}

// Hand-supplied portraits (manual entries, `portrait:` overrides) are used as-is
// unless --normalize-manual asks for the same 720×720 webp treatment, in place.
async function normalizeHandSupplied(filename: string, label: string): Promise<void> {
  if (!NORMALIZE_MANUAL) return
  const file = path.join(PORTRAITS_DIR, filename)
  const buffer = await normalizeImage(fs.readFileSync(file), label)
  if (!DRY_RUN) fs.writeFileSync(file, buffer)
  console.log(`  ✎ ${DRY_RUN ? 'would normalise' : 'normalised'} ${filename}`)
}

async function pullPretalx(entry: PretalxAllowlistEntry): Promise<PulledRecord | null> {
  const speaker = await fetchSpeaker(entry.code)
  if (!speaker) return null

  const organization = answerFor(speaker, QUESTION_ORGANIZATION) ?? ''
  const xHandle = normalizeXHandle(answerFor(speaker, QUESTION_X), `${speaker.code} ${speaker.name}`)
  const portrait = entry.portrait ?? portraitFilename(speaker.name)

  if (entry.portrait) {
    if (!fs.existsSync(path.join(PORTRAITS_DIR, entry.portrait))) {
      errors.push(
        `${speaker.code} ${speaker.name}: portrait override "${entry.portrait}" not found in assets/portraits/`
      )
      return null
    }
    await normalizeHandSupplied(entry.portrait, `${speaker.code} ${speaker.name}`)
  } else if (!(await downloadPortrait(speaker, portrait))) {
    return null
  }

  // The UI has no fallback for a missing organization (it is always rendered),
  // so fail like a missing portrait rather than shipping an empty line.
  if (!organization && !entry.company) {
    errors.push(`${speaker.code} ${speaker.name}: no organization answer — set \`company:\` in the allowlist`)
    return null
  }
  if (!entry.title) missingTitles.push(`${speaker.code} ${entry.name ?? speaker.name}`)

  console.log(`  ${speaker.code}  ${entry.name ?? speaker.name}`)
  console.log(
    `     org:   ${entry.company ?? organization ?? '—'}${
      entry.company ? ` (override; Pretalx says "${organization || '—'}")` : ''
    }`
  )
  console.log(`     x:     ${entry.xHandle ?? xHandle ?? '—'}`)
  console.log(`     title: ${entry.title ?? 'MISSING → fill `title` in speakers-allowlist.ts'}`)
  console.log(`     bio:   ${(speaker.biography ?? '').replace(/\s+/g, ' ').slice(0, 400) || '—'}`)

  return {
    id: entry.code,
    name: speaker.name,
    organization,
    ...(xHandle ? { xHandle } : {}),
    portrait,
    source: 'pretalx',
  }
}

async function pullManual(entry: ManualAllowlistEntry): Promise<PulledRecord | null> {
  const { id, name, company, portrait } = entry.manual
  const file = path.join(PORTRAITS_DIR, portrait)
  if (!fs.existsSync(file)) {
    errors.push(`${id}: manual portrait "${portrait}" not found in assets/portraits/`)
    return null
  }
  await normalizeHandSupplied(portrait, id)
  if (!entry.title) missingTitles.push(id)
  console.log(`  ${id}  ${name}  (manual)`)
  console.log(`     org:   ${company}`)
  // xHandle stays in the allowlist only — the merge reads it from there.
  return { id, name, organization: company, portrait, source: 'manual' }
}

function importIdentifier(id: string): string {
  return `img${id.replace(/[^A-Za-z0-9]/g, '')}`
}

async function emitGeneratedFile(records: PulledRecord[]): Promise<void> {
  const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id))
  const lines: string[] = [
    '/* eslint-disable */',
    '// AUTO-GENERATED by `pnpm speakers:pull` (src/scripts/pull-constellation-speakers.ts).',
    '// Do not edit by hand — curation lives in speakers-allowlist.ts. Re-run the script after changing it.',
    "import type { StaticImageData } from 'next/image'",
    '',
    ...sorted.map(r => `import ${importIdentifier(r.id)} from './assets/portraits/${r.portrait}'`),
    '',
    'export interface PulledSpeaker {',
    '  id: string',
    '  name: string',
    '  /** Pretalx question 153 answer (or the manual entry’s company). Empty string when unanswered. */',
    '  organization: string',
    '  /** Bare X handle parsed from Pretalx question 142. */',
    '  xHandle?: string',
    '  image: StaticImageData',
    "  source: 'pretalx' | 'manual'",
    '}',
    '',
    'export const PULLED_SPEAKERS: Record<string, PulledSpeaker> = {',
    ...sorted.map(r => {
      const fields = [
        `id: ${JSON.stringify(r.id)}`,
        `name: ${JSON.stringify(r.name)}`,
        `organization: ${JSON.stringify(r.organization)}`,
        ...(r.xHandle ? [`xHandle: ${JSON.stringify(r.xHandle)}`] : []),
        `image: ${importIdentifier(r.id)}`,
        `source: ${JSON.stringify(r.source)}`,
      ]
      return `  ${JSON.stringify(r.id)}: { ${fields.join(', ')} },`
    }),
    '}',
    '',
  ]
  const prettierConfig = (await prettier.resolveConfig(OUTPUT_FILE)) ?? {}
  const code = prettier.format(lines.join('\n'), { ...prettierConfig, parser: 'typescript' })
  if (DRY_RUN) {
    console.log(`\n— would write ${path.relative(process.cwd(), OUTPUT_FILE)} (${sorted.length} speakers)`)
    return
  }
  fs.writeFileSync(OUTPUT_FILE, code)
  console.log(`\n✔ wrote ${path.relative(process.cwd(), OUTPUT_FILE)} (${sorted.length} speakers)`)
}

function sweepOrphans(records: PulledRecord[]): void {
  const referenced = new Set(records.map(r => r.portrait))
  const orphans = fs.readdirSync(PORTRAITS_DIR).filter(f => IMAGE_EXT.test(f) && !referenced.has(f))
  const deleting = PRUNE && !DRY_RUN
  for (const file of orphans) {
    if (deleting) fs.unlinkSync(path.join(PORTRAITS_DIR, file))
    console.log(
      deleting
        ? `  ✂ removed unreferenced portrait ${file}`
        : `  ⚠ unreferenced portrait ${file}${PRUNE ? ' (would remove)' : ' — pass --prune to delete'}`
    )
  }
}

async function main(): Promise<void> {
  fs.mkdirSync(PORTRAITS_DIR, { recursive: true })

  const ids = SPEAKER_ALLOWLIST.map(allowlistId)
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i)
  if (duplicates.length) {
    console.error(`Duplicate allowlist ids: ${[...new Set(duplicates)].join(', ')}`)
    process.exit(1)
  }

  console.log(
    `Pulling ${SPEAKER_ALLOWLIST.length} speakers from ${PRETALX_BASE}/events/${EVENT_SLUG}${
      DRY_RUN ? ' (dry run)' : ''
    }\n`
  )

  const records: PulledRecord[] = []
  for (const entry of SPEAKER_ALLOWLIST as AllowlistEntry[]) {
    const record = 'manual' in entry ? await pullManual(entry) : await pullPretalx(entry)
    if (record) records.push(record)
  }

  // Only rewrite the generated file when every allowlisted speaker resolved:
  // a partial file would make speakers-data.ts throw at build time.
  if (errors.length === 0) {
    sweepOrphans(records)
    await emitGeneratedFile(records)
  }

  console.log(
    `\nSummary: ${records.length}/${SPEAKER_ALLOWLIST.length} speakers resolved, ${downloaded} portrait(s) ${
      DRY_RUN ? 'to download' : 'downloaded'
    }`
  )
  if (missingTitles.length)
    console.log(`Titles still missing (fill \`title\` in speakers-allowlist.ts): ${missingTitles.join(', ')}`)
  for (const w of warnings) console.warn(`⚠ ${w}`)
  for (const e of errors) console.error(`✖ ${e}`)
  if (errors.length) {
    console.error('\nGenerated file NOT written because of the errors above.')
    process.exit(1)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
