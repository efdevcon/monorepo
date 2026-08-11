// One-time setup: shapes the (empty) Notion database the comms team will
// manage into the schema /api/links/ expects. Idempotent: re-running is safe.
//
//   NOTION_SECRET=... NOTION_LINKS_DB_ID=... pnpm setup:notion [--seed]
//
// --seed inserts one sample row so the API can be tested end to end.
import 'dotenv/config'

const NOTION_VERSION = '2022-06-28'
// Same default as devcon/src/services/notion-links.ts; the id is not secret.
const DEFAULT_DB_ID = '3b8638cdc415800abc4af8ba6c2af023'
const secret = process.env.NOTION_SECRET
const dbId = process.env.NOTION_LINKS_DB_ID ?? DEFAULT_DB_ID
if (!secret) {
  console.error('NOTION_SECRET is required')
  process.exit(1)
}

async function notion(path: string, method: string, body?: unknown): Promise<any> {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    method,
    headers: { Authorization: `Bearer ${secret}`, 'Notion-Version': NOTION_VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`Notion ${method} ${path} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

const db = await notion(`databases/${dbId}`, 'GET')
const existing: Record<string, { type: string }> = db.properties

// The default title property is usually called "Name"; rename it to Title.
const titleProp = Object.entries(existing).find(([, p]) => p.type === 'title')
if (!titleProp) throw new Error('database has no title property')

const properties: Record<string, unknown> = {}
if (titleProp[0] !== 'Title') properties[titleProp[0]] = { name: 'Title' }
if (existing.Tags) properties.Tags = null // drop Notion's default Tags column
if (!existing.URL) properties.URL = { url: {} }
if (!existing.Image) properties.Image = { files: {} }
if (!existing.Order) properties.Order = { number: { format: 'number' } }
if (!existing.Visible) properties.Visible = { checkbox: {} }

if (Object.keys(properties).length > 0) {
  await notion(`databases/${dbId}`, 'PATCH', { properties })
  console.log('updated properties:', Object.keys(properties).join(', '))
} else {
  console.log('schema already up to date')
}

const updated = await notion(`databases/${dbId}`, 'GET')
for (const required of ['Title', 'URL', 'Image', 'Order', 'Visible']) {
  if (!updated.properties[required]) throw new Error(`property ${required} missing after update`)
}
console.log('schema OK:', Object.keys(updated.properties).join(', '))

// Editor-facing instructions shown under the database title, including the
// one-click "push live" link (purges the API's CDN cache for everyone).
await notion(`databases/${dbId}`, 'PATCH', {
  description: [
    { text: { content: 'Each row is one button on the Devcon ENS page.\n' } },
    { text: { content: 'Edits go live automatically within ~1 hour. To skip the wait:\n' } },
    { text: { content: '👀 Preview live changes', link: { url: 'https://d.krux.eth.limo/?preview' } } },
    { text: { content: '   ·   ' } },
    { text: { content: '⚡ Push changes live', link: { url: 'https://devcon.org/api/links/refresh/' } } },
  ],
})
console.log('description set (push-live + preview links)')

if (process.argv.includes('--seed')) {
  await notion('pages', 'POST', {
    parent: { database_id: dbId },
    properties: {
      Title: { title: [{ text: { content: 'Devcon 2026 in Mumbai' } }] },
      URL: { url: 'https://devcon.org/en/' },
      Order: { number: 1 },
      Visible: { checkbox: true },
    },
  })
  console.log('seeded 1 sample row')
}
