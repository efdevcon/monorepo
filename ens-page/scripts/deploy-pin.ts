// Builds are pinned to IPFS via Pinata; the ENS contenthash update stays a
// manual wallet action (rare by design: record and Notion edits never need a
// redeploy). Run: PINATA_JWT=... pnpm deploy:pin
import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative, sep, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const jwt = process.env.PINATA_JWT
if (!jwt) {
  console.error('PINATA_JWT is required (pinata.cloud -> API Keys, scope: pinFileToIPFS)')
  process.exit(1)
}

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else yield p
  }
}

const form = new FormData()
const rels: string[] = []
for await (const file of walk(DIST)) {
  const rel = relative(DIST, file).split(sep).join('/')
  // A shared top-level folder in the filenames makes Pinata pin the upload
  // as a single directory whose CID serves index.html at its root.
  const bytes = new Uint8Array(await readFile(file))
  form.append('file', new File([bytes], `ens-page/${rel}`))
  rels.push(rel)
}
const count = rels.length
if (count === 0) {
  console.error('dist/ is empty, run pnpm build first')
  process.exit(1)
}
form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))
form.append('pinataMetadata', JSON.stringify({ name: 'ens-page' }))

const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
  method: 'POST',
  headers: { Authorization: `Bearer ${jwt}` },
  body: form,
})
if (!res.ok) {
  console.error(`Pinata upload failed (${res.status}): ${await res.text()}`)
  process.exit(1)
}
const { IpfsHash } = (await res.json()) as { IpfsHash: string }
const ensName = process.env.VITE_ENS_NAME ?? 'd.krux.eth'

console.log(`\npinned ${count} files`)
console.log(`CID:        ${IpfsHash}`)
console.log(`URI:        ipfs://${IpfsHash}`)
// Note: dweb.link/ipfs.io serve browsers a service-worker bootstrap page, so
// "view source" there shows the loader; curl (or eth.limo itself) gets the
// raw content directly.
console.log(`Preview:    https://${IpfsHash}.ipfs.dweb.link/`)
console.log(`Preview:    https://ipfs.io/ipfs/${IpfsHash}/`)
console.log(`\nTo go live: open https://app.ens.domains/${ensName} -> Records -> Edit Records ->`)
console.log(`set Content Hash to ipfs://${IpfsHash} and confirm with the name owner's wallet.`)
console.log(`Then verify at https://${ensName}.limo/`)

// Warm the big public gateways: they only fetch a new CID when first asked,
// and DHT discovery takes 30-90s. Requesting every file now means the first
// real visitor (and eth.limo) gets warm content instead of doing that wait,
// which is what broke assets on first load after earlier contenthash flips.
// Unchanged assets keep their hashed filenames, so most are warm from
// previous deploys. Fast pass, ~60s worst case: wait briefly for the index
// to become discoverable, then fire one request per file per gateway.
const GATEWAYS = ['https://ipfs.io/ipfs', 'https://dweb.link/ipfs']
async function warmGateway(base: string): Promise<number> {
  const deadline = Date.now() + 45_000
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${base}/${IpfsHash}/`, { signal: AbortSignal.timeout(15_000) })
      if (r.ok) break
    } catch {
      /* not discoverable yet */
    }
    await new Promise(resolve => setTimeout(resolve, 2000))
  }
  const assets = await Promise.allSettled(
    rels.map(rel => fetch(`${base}/${IpfsHash}/${rel}`, { signal: AbortSignal.timeout(15_000) }))
  )
  return assets.filter(a => a.status === 'fulfilled' && a.value.ok).length
}
console.log('\nwarming gateways (ipfs.io, dweb.link)…')
const warmed = await Promise.all(GATEWAYS.map(warmGateway))
GATEWAYS.forEach((g, i) => console.log(`${warmed[i]}/${count} warm  ${g}/${IpfsHash}/`))

// Prune superseded pins so the free plan's file quota doesn't fill up:
// keep the newest KEEP versions, and never touch the just-pinned CID or
// whatever CID the ENS name is currently serving (deleting the live pin
// takes the site down slowly via gateway-cache decay). Requires the JWT to
// also have pinList + unpin scopes; skipped gracefully otherwise.
const KEEP = 3
try {
  const liveCid = await fetch(`https://${ensName}.limo/`, { method: 'HEAD', signal: AbortSignal.timeout(15000) })
    .then(r => r.headers.get('x-ipfs-roots'))
    .catch(() => null)

  const listRes = await fetch(
    'https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=100&metadata[name]=ens-page',
    { headers: { Authorization: `Bearer ${jwt}` } }
  )
  if (!listRes.ok) throw new Error(`pinList failed (${listRes.status}): ${await listRes.text()}`)
  const rows = (((await listRes.json()) as { rows?: { ipfs_pin_hash: string; date_pinned: string }[] }).rows ?? [])
    .sort((a, b) => b.date_pinned.localeCompare(a.date_pinned))

  const stale = rows.slice(KEEP).filter(r => r.ipfs_pin_hash !== IpfsHash && r.ipfs_pin_hash !== liveCid)
  if (stale.length === 0) {
    console.log(`\npin pruning: nothing to prune (${rows.length} version(s) pinned, keeping ${KEEP})`)
  }
  for (const r of stale) {
    const del = await fetch(`https://api.pinata.cloud/pinning/unpin/${r.ipfs_pin_hash}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    })
    console.log(del.ok ? `pruned old pin ${r.ipfs_pin_hash}` : `failed to prune ${r.ipfs_pin_hash} (${del.status})`)
  }
} catch (e) {
  console.warn(`\npin pruning skipped: ${(e as Error).message}`)
  console.warn('(the PINATA_JWT needs the pinList and unpin scopes for automatic pruning)')
}
