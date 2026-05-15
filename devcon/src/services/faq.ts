import * as fs from 'fs'
import * as path from 'path'

export interface FaqItem {
  id: number
  question: string
  answer: string
  category: string
  /** Multi-select column from NocoDB. NocoDB serializes multi-select fields
   *  as a comma-separated string (e.g. "checkout,faq") or null when empty;
   *  we normalize both into a plain array of trimmed tag strings. Used to
   *  surface FAQs on per-page slices (e.g. the checkout page picks `page`
   *  containing "checkout"). */
  pages: string[]
}

export interface FaqData {
  categories: string[]
  items: FaqItem[]
}

interface RawNocoFaqRow {
  Id: number
  Question?: string
  Answer?: string
  Category?: string
  Published?: boolean
  Page?: string | null
}

const SUPPORTED_LOCALES = ['en', 'hi', 'mr'] as const

// Categories in NocoDB are prefixed with "N." so they sort canonically; the
// prefix is presentation noise and gets stripped before render.
function stripCategoryPrefix(label: string): string {
  return label.replace(/^\s*\d+\.\s*/, '')
}

function getCategoryOrder(label: string): number {
  const match = /^\s*(\d+)\./.exec(label)
  return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER
}

// translateJson loses the top-level array shape on some locales (writes
// `{"0": {...}, "1": {...}}` instead of `[{...}, ...]`). Normalize both shapes
// so the consumer doesn't care which form landed on disk.
function normalizeFaqRows(parsed: unknown): RawNocoFaqRow[] {
  if (Array.isArray(parsed)) return parsed as RawNocoFaqRow[]
  if (parsed && typeof parsed === 'object') return Object.values(parsed as Record<string, RawNocoFaqRow>)
  return []
}

function readSyncedFaqFile(locale: string): RawNocoFaqRow[] {
  const target = (SUPPORTED_LOCALES as readonly string[]).includes(locale) ? locale : 'en'
  const filePath = path.resolve(process.cwd(), `content/${target}/external/nocodb/faq.json`)
  if (fs.existsSync(filePath)) {
    return normalizeFaqRows(JSON.parse(fs.readFileSync(filePath, 'utf-8')))
  }
  // Translated locale missing → fall back to English so the page never renders empty
  // due to a sync race rather than missing data.
  if (target !== 'en') {
    const fallback = path.resolve(process.cwd(), 'content/en/external/nocodb/faq.json')
    if (fs.existsSync(fallback)) return normalizeFaqRows(JSON.parse(fs.readFileSync(fallback, 'utf-8')))
  }
  return []
}

export async function getFaqData(locale: string = 'en'): Promise<FaqData> {
  const rows = readSyncedFaqFile(locale)

  const categoryFirstSeen = new Map<string, number>()
  const items: FaqItem[] = []

  for (const r of rows) {
    if (r.Published === false) continue
    const rawCategory = r.Category || ''
    if (rawCategory && !categoryFirstSeen.has(rawCategory)) {
      categoryFirstSeen.set(rawCategory, getCategoryOrder(rawCategory))
    }
    const pages = typeof r.Page === 'string'
      ? r.Page.split(',').map(s => s.trim()).filter(Boolean)
      : []
    items.push({
      id: r.Id,
      question: r.Question || '',
      answer: r.Answer || '',
      category: stripCategoryPrefix(rawCategory),
      pages,
    })
  }

  const categories = [...categoryFirstSeen.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([raw]) => stripCategoryPrefix(raw))

  return { categories, items }
}
