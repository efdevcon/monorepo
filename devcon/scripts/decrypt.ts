#!/usr/bin/env tsx
/**
 * Decrypt every encrypted attachment on a NocoDB table into a tidy local tree.
 *
 *   pnpm forms:decrypt <viewId>
 *
 * Required environment (loaded from process.env first, then `.env.decrypt`,
 * `.env.local`, `.env` in the repo root — `process.env` wins so a secrets
 * manager can override file-based values):
 *
 *   AGE_PRIVATE_KEY    — the recipient's age secret key (AGE-SECRET-KEY-1...)
 *   NOCODB_BASE_URL    — e.g. https://form.example.org
 *   NOCODB_API_TOKEN   — NocoDB API token with read access to the target base
 *
 * The script walks every row of the table behind <viewId>, identifies columns
 * whose title starts with "[encrypted]" and uidt "Attachment", downloads each
 * ciphertext, decrypts it in memory with AGE_PRIVATE_KEY, and writes the
 * plaintext to:
 *
 *   decrypted/<column-title>/<display-field-value><ext>
 *
 * where:
 *   - <column-title> has the "[encrypted]" prefix stripped
 *   - <display-field-value> comes from the table's display field (e.g.
 *     "Full Name") — the same value NocoDB shows as the row label
 *   - <ext> is taken from the original filename sealed inside the envelope
 *
 * Both `decrypted/` and `.env.decrypt` are git-ignored.
 */

import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname } from 'node:path'
import { config as loadDotenv } from 'dotenv'
import { Decrypter } from 'age-encryption'
import { unpackEnvelope } from '../src/utils/age-envelope'

// Load env from .env.decrypt / .env.local / .env (relative to where the
// script is invoked from — `pnpm` always runs scripts from the package
// root). Existing process.env values win, so anything injected at runtime
// by a secrets manager keeps precedence over file-based values.
for (const candidate of ['.env.decrypt', '.env.local', '.env']) {
  const p = join(process.cwd(), candidate)
  if (existsSync(p)) {
    loadDotenv({ path: p, override: false })
  }
}

interface NocoAttachment {
  url?: string
  path?: string
  signedPath?: string
  title: string
  mimetype: string
  size: number
}

const ENCRYPTED_PREFIX = '[encrypted]'

function die(msg: string): never {
  console.error(`error: ${msg}`)
  process.exit(1)
}

function sanitizeForFilesystem(name: string, fallback: string): string {
  // Strip control chars + characters that break filesystems / shells.
  const cleaned = name
    .replace(/[\\/:*?"<>|\0\r\n\t]/g, '_')
    .replace(/^\.+/, '_')
    .trim()
  return cleaned.length > 0 ? cleaned : fallback
}

function mimeToExt(mime: string): string {
  const map: Record<string, string> = {
    'application/pdf': '.pdf',
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  }
  return map[mime.toLowerCase()] || ''
}

async function nocoFetch<T>(baseUrl: string, token: string, path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, { headers: { 'xc-token': token } })
  if (!res.ok) die(`NocoDB ${path} → HTTP ${res.status} ${await res.text()}`)
  return res.json() as Promise<T>
}

async function main() {
  const [, , idArg] = process.argv
  if (!idArg) die('usage: pnpm forms:decrypt <viewId|tableId>')

  const ageKey = process.env.AGE_PRIVATE_KEY?.trim()
  const baseUrl = process.env.NOCODB_BASE_URL?.replace(/\/$/, '')
  const apiToken = process.env.NOCODB_API_TOKEN
  if (!ageKey) die('AGE_PRIVATE_KEY env var is required')
  if (!ageKey.startsWith('AGE-SECRET-KEY-')) die('AGE_PRIVATE_KEY does not look like an age secret key')
  if (!baseUrl) die('NOCODB_BASE_URL env var is required')
  if (!apiToken) die('NOCODB_API_TOKEN env var is required')

  // Resolve to a tableId. Accept either a tableId directly (works for any
  // view type) or a view-agnostic columns lookup that returns the parent
  // model. Form-specific endpoints (/forms/<id>) 500 on grid/gallery/kanban
  // views, so we don't use them.
  let tableId: string
  try {
    const viewCols = await nocoFetch<{ list?: { fk_column_id: string }[] }>(
      baseUrl,
      apiToken,
      `/api/v1/db/meta/views/${idArg}/columns`
    )
    const firstColId = viewCols.list?.[0]?.fk_column_id
    if (!firstColId) throw new Error('view has no columns')
    const colMeta = await nocoFetch<{ fk_model_id: string }>(
      baseUrl,
      apiToken,
      `/api/v1/db/meta/columns/${firstColId}`
    )
    tableId = colMeta.fk_model_id
  } catch {
    // Fall back to assuming the argument is itself a tableId.
    tableId = idArg
  }

  const table = await nocoFetch<{
    display_field_id?: string
    columns: { id: string; title: string; column_name: string; uidt: string; pv?: boolean }[]
  }>(baseUrl, apiToken, `/api/v1/db/meta/tables/${tableId}`)

  // Locate the display field (the "main column") — the row label NocoDB
  // shows. The REST API exposes it via the `pv` (primary-value) flag on
  // the column; some response shapes also include `display_field_id`.
  const displayCol =
    (table.display_field_id && table.columns.find(c => c.id === table.display_field_id)) ||
    table.columns.find(c => c.pv === true)
  if (!displayCol) die('table has no primary-value column (no display field)')
  console.log(`display field: "${displayCol.title}"`)

  const encryptedCols = table.columns.filter(
    c => c.uidt === 'Attachment' && c.title.trim().toLowerCase().startsWith(ENCRYPTED_PREFIX)
  )
  if (encryptedCols.length === 0) die('no [encrypted] Attachment columns on this table')
  console.log(`encrypted columns: ${encryptedCols.map(c => `"${c.title}"`).join(', ')}`)

  const decrypter = new Decrypter()
  decrypter.addIdentity(ageKey)

  // Pre-create one output folder per encrypted column (prefix stripped).
  const folderForCol = new Map<string, string>()
  for (const c of encryptedCols) {
    const folderName = sanitizeForFilesystem(
      c.title.trim().slice(ENCRYPTED_PREFIX.length).trim(),
      c.column_name
    )
    const folderPath = join('decrypted', folderName)
    await mkdir(folderPath, { recursive: true })
    folderForCol.set(c.title, folderPath)
  }

  // Paginate the table.
  let offset = 0
  const limit = 100
  let totalRows = 0
  let recovered = 0
  let skipped = 0
  const usedNames = new Map<string, number>() // per-folder filename collision counter

  while (true) {
    const page = await nocoFetch<{
      list: Record<string, unknown>[]
      pageInfo?: { isLastPage?: boolean }
    }>(baseUrl, apiToken, `/api/v2/tables/${tableId}/records?limit=${limit}&offset=${offset}`)
    const rows = page.list ?? []
    if (rows.length === 0) break
    totalRows += rows.length

    for (const row of rows) {
      const rowId = (row.Id ?? row.id) as string | number | undefined
      const rawDisplay = row[displayCol.title]
      const displayValue = sanitizeForFilesystem(
        typeof rawDisplay === 'string' && rawDisplay.trim().length > 0
          ? rawDisplay
          : `row_${rowId ?? 'unknown'}`,
        `row_${rowId ?? 'unknown'}`
      )

      for (const col of encryptedCols) {
        const atts = row[col.title]
        if (!Array.isArray(atts) || atts.length === 0) continue

        const outDir = folderForCol.get(col.title)!
        for (let i = 0; i < (atts as NocoAttachment[]).length; i++) {
          const a = (atts as NocoAttachment[])[i]
          const fetchUrl = a.url
            ? a.url
            : a.signedPath
            ? `${baseUrl}/${a.signedPath}`
            : a.path
            ? `${baseUrl}/${a.path}`
            : null
          if (!fetchUrl) {
            console.warn(`  skip ${displayValue}: no URL on attachment`)
            skipped++
            continue
          }
          const headers: Record<string, string> = {}
          if (a.path && !a.signedPath && !a.url) headers['xc-token'] = apiToken

          let blobRes: Response
          try {
            blobRes = await fetch(fetchUrl, { headers })
          } catch (err) {
            console.warn(`  skip ${displayValue}: fetch error: ${(err as Error).message}`)
            skipped++
            continue
          }
          if (!blobRes.ok) {
            console.warn(`  skip ${displayValue}: HTTP ${blobRes.status}`)
            skipped++
            continue
          }
          const ciphertext = new Uint8Array(await blobRes.arrayBuffer())

          let envelope: Uint8Array
          try {
            envelope = await decrypter.decrypt(ciphertext)
          } catch (err) {
            console.warn(`  skip ${displayValue}: decrypt failed (${(err as Error).message})`)
            skipped++
            continue
          }

          const { meta, file } = unpackEnvelope(envelope)
          const ext = extname(meta.filename) || mimeToExt(meta.mimetype) || ''
          // If multiple files per row in the same column, suffix to disambiguate.
          const baseName = (atts as NocoAttachment[]).length > 1 ? `${displayValue} (${i + 1})` : displayValue
          // If multiple rows share the same display value, suffix _2, _3, ...
          const folderKey = `${outDir}|${baseName}${ext}`
          const seen = usedNames.get(folderKey) ?? 0
          usedNames.set(folderKey, seen + 1)
          const finalName = seen === 0 ? `${baseName}${ext}` : `${baseName}_${seen + 1}${ext}`

          const outPath = join(outDir, finalName)
          await writeFile(outPath, file)
          console.log(`  ✓ ${outPath}  (${file.length} bytes)`)
          recovered++
        }
      }
    }

    if (page.pageInfo?.isLastPage || rows.length < limit) break
    offset += limit
  }

  console.log(`\nscanned ${totalRows} row(s); decrypted ${recovered} file(s); skipped ${skipped}`)
  console.log(`output: decrypted/`)
  console.log(`reminder: delete plaintext when you're done with it.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
