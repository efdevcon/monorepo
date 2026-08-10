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
let count = 0
for await (const file of walk(DIST)) {
  const rel = relative(DIST, file).split(sep).join('/')
  // A shared top-level folder in the filenames makes Pinata pin the upload
  // as a single directory whose CID serves index.html at its root.
  const bytes = new Uint8Array(await readFile(file))
  form.append('file', new File([bytes], `ens-page/${rel}`))
  count++
}
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
