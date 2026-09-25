import { createDecipheriv, pbkdf2Sync } from 'crypto'
import { gunzipSync } from 'zlib'
import nacl from 'tweetnacl'
import * as Y from 'yjs'
import { keccak256, stringToBytes } from 'viem'

// Read-only client for Fileverse dSheets (sheets.fileverse.io).
//
// Fileverse has no read API, but the hosted app is a thin client: it looks
// the sheet up in a public indexer, downloads the encrypted workbook from
// IPFS and decrypts it in the browser with the key carried in the share link
// (`#k=`). This module does the same server side, following the app's own
// key-unlock chain (mirrored from its bundle, 2026-09):
//
//   appFileId = keccak256(dsheetId)
//   gate      = ipfs(indexer.gateIPFSHash)
//   K         = nacl.secretbox.open(gate.keyMaterial, linkKey)
//   fileKey   = AES-256-CBC(pbkdf2(K, salt), gate.lockedFileKey)
//   workbook  = AES-256-GCM(fileKey, ipfs(indexer.contentIPFSHash))  -> JSON { file: 'gz1:' + gzip(yjs update) }
//
// What comes back is the last version the owner's browser published to IPFS,
// not the live collaborative state. The app publishes shortly after edits, so
// in practice this lags the sheet by minutes at most.

const INDEXER_URL = 'https://apps-indexer.fileverse.io'
const IPFS_GATEWAYS = ['https://apps-ipfs.fileverse.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/']
const PART_SEPARATOR = '__n__'

export interface DSheetLink {
  dsheetId: string
  linkKey: Buffer
}

export interface DSheetCell {
  row: number
  col: number
  /** Raw stored value (number for numeric/time cells, string otherwise). */
  value: string | number | boolean | null
  /** Display text as the sheet shows it, e.g. "09:00" for a time cell. */
  text: string
  /** Number format of the cell when set, e.g. "hh:mm". */
  format?: string
}

export interface DSheetTab {
  id: string
  name: string
  order: number
  cells: DSheetCell[]
}

export interface DSheet {
  dsheetId: string
  tabs: DSheetTab[]
  /** When the owner last published this version (ms since epoch). */
  publishedAt: number
}

/** Parse a share link of the form https://sheets.fileverse.io/sheet/<id>#k=<key>. */
export function parseDSheetLink(url: string): DSheetLink {
  const parsed = new URL(url)
  const match = parsed.pathname.match(/\/sheet\/([1-9A-HJ-NP-Za-km-z]+)/)
  const key = new URLSearchParams(parsed.hash.replace(/^#/, '')).get('k')
  if (!match || !key) throw new Error('Not a dSheets share link (expected https://sheets.fileverse.io/sheet/<id>#k=<key>)')
  const linkKey = fromBase64(key)
  if (linkKey.length !== nacl.secretbox.keyLength) throw new Error('dSheets link key has an unexpected length')
  return { dsheetId: match[1], linkKey }
}

export async function readDSheet(link: DSheetLink): Promise<DSheet> {
  const appFileId = keccak256(stringToBytes(link.dsheetId))
  const indexed = await fetchJson(`${INDEXER_URL}/dsheet/by-id/${appFileId}`)
  if (!indexed) throw new Error(`dSheet ${link.dsheetId} is not known to the Fileverse indexer`)
  if (indexed.isDeleted) throw new Error(`dSheet ${link.dsheetId} was deleted`)
  if (!indexed.gateIPFSHash || !indexed.contentIPFSHash) throw new Error(`dSheet ${link.dsheetId} has no published content yet`)

  const [gate, content] = await Promise.all([fetchIpfs(indexed.gateIPFSHash), fetchIpfs(indexed.contentIPFSHash)])
  const fileKey = unlockFileKey(JSON.parse(gate.toString('utf8')), link.linkKey)
  const update = decodeWorkbookUpdate(decryptContent(fileKey, content))

  const doc = new Y.Doc()
  try {
    Y.applyUpdate(doc, update)
    return {
      dsheetId: link.dsheetId,
      tabs: readTabs(doc.getArray(link.dsheetId)),
      publishedAt: Number(indexed.lastTransactionBlockTimestamp ?? indexed.createdBlockTimestamp ?? 0),
    }
  } finally {
    doc.destroy()
  }
}

interface Gate {
  keyMaterial?: string
  lockedFileKey?: string
}

function unlockFileKey(gate: Gate, linkKey: Buffer): Buffer {
  if (!gate.keyMaterial || !gate.lockedFileKey) {
    throw new Error('dSheet has no link access (owner must share it with a link)')
  }
  const [salt, nonce, box] = gate.keyMaterial.split(PART_SEPARATOR)
  const [iv, cipherText] = gate.lockedFileKey.split(PART_SEPARATOR)
  if (!salt || !nonce || !box || !iv || !cipherText) throw new Error('dSheet gate has an unexpected format')

  const intermediate = nacl.secretbox.open(fromBase64(box), fromBase64(nonce), linkKey)
  if (!intermediate) throw new Error('dSheet link key does not open this sheet (wrong or rotated link)')

  const derived = pbkdf2Sync(Buffer.from(intermediate), fromBase64(salt), 32, 32, 'sha256')
  const decipher = createDecipheriv('aes-256-cbc', derived, fromBase64(iv))
  return Buffer.concat([decipher.update(fromBase64(cipherText)), decipher.final()])
}

/** Content layout: [ciphertext][16-byte auth tag][12-byte IV]. */
function decryptContent(fileKey: Buffer, payload: Buffer): string {
  if (payload.length < 28) throw new Error('dSheet content is too short to be encrypted content')
  const iv = payload.subarray(payload.length - 12)
  const tag = payload.subarray(payload.length - 28, payload.length - 12)
  const data = payload.subarray(0, payload.length - 28)
  const decipher = createDecipheriv('aes-256-gcm', fileKey, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

/** The decrypted content is JSON whose `file` holds the Yjs update, gzip-compressed when prefixed with `gz1:`. */
function decodeWorkbookUpdate(json: string): Uint8Array {
  const parsed = JSON.parse(json)
  const file: unknown = parsed && typeof parsed === 'object' && 'file' in parsed ? parsed.file : parsed
  if (typeof file !== 'string' || !file) throw new Error('dSheet content has no workbook data')
  if (file.startsWith('gz1:')) return new Uint8Array(gunzipSync(fromBase64(file.slice(4))))
  return new Uint8Array(fromBase64(file))
}

function readTabs(sheets: Y.Array<unknown>): DSheetTab[] {
  const tabs: DSheetTab[] = []
  for (const entry of sheets.toArray()) {
    const get = (key: string): unknown => (entry instanceof Y.Map ? entry.get(key) : (entry as Record<string, unknown>)?.[key])
    const celldata = get('celldata')
    const plain = celldata instanceof Y.Map ? celldata.toJSON() : celldata
    tabs.push({
      id: String(get('id') ?? ''),
      name: String(get('name') ?? ''),
      order: typeof get('order') === 'number' ? (get('order') as number) : tabs.length,
      cells: toCells(plain),
    })
  }
  return tabs.sort((a, b) => a.order - b.order)
}

function toCells(celldata: unknown): DSheetCell[] {
  const entries: any[] = Array.isArray(celldata) ? celldata : celldata && typeof celldata === 'object' ? Object.values(celldata) : []
  const cells: DSheetCell[] = []
  for (const entry of entries) {
    const cell = entry?.v
    if (!cell || typeof cell !== 'object') continue
    // Merged ranges repeat the anchor's `mc` on every covered cell without a value.
    const runs = Array.isArray(cell.ct?.s) ? cell.ct.s.map((run: any) => String(run?.v ?? '')).join('') : ''
    const value = cell.v ?? (runs || null)
    const text = typeof cell.m === 'string' && cell.m !== '' ? cell.m : runs || (value == null ? '' : String(value))
    if (value == null && text === '') continue
    cells.push({
      row: Number(entry.r),
      col: Number(entry.c),
      value,
      text: text.replace(/\r\n?/g, '\n').trim(),
      format: typeof cell.ct?.fa === 'string' && cell.ct.fa !== 'General' ? cell.ct.fa : undefined,
    })
  }
  return cells.sort((a, b) => a.row - b.row || a.col - b.col)
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`)
  return res.json()
}

async function fetchIpfs(hash: string): Promise<Buffer> {
  let lastError: unknown
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const res = await fetch(`${gateway}${hash}`)
      if (res.ok) return Buffer.from(await res.arrayBuffer())
      lastError = new Error(`${gateway}${hash} -> ${res.status}`)
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`Could not fetch ${hash} from IPFS: ${lastError instanceof Error ? lastError.message : String(lastError)}`)
}

/** Fileverse mixes standard and URL-safe base64; Node's decoder accepts both alphabets. */
function fromBase64(value: string): Buffer {
  return Buffer.from(value, 'base64')
}
