import fs from 'fs'

const INPUT_FILES = [
    'inputs/the-merge-contributors.json',
    'inputs/protocol-guild-2026.json',
]
const OUTPUT_FILE = 'outputs/core-devs.json'
const ENS_RESOLVER = 'https://api.ensideas.com/ens/resolve/'

parse()

// Merge the core dev source lists into a single de-duplicated list of addresses.
// Entries may be raw 0x addresses, ENS names (resolved to addresses), or
// github: handles (no on-chain address, skipped).
async function parse() {
    const entries = new Set<string>()
    for (const file of INPUT_FILES) {
        const list = JSON.parse(fs.readFileSync(file, 'utf-8')) as string[]
        for (const entry of list) entries.add(entry.trim())
    }

    const addresses = new Set<string>()
    const handles = new Set<string>()
    const unresolved: string[] = []

    for (const entry of entries) {
        if (/^0x[0-9a-fA-F]{40}$/.test(entry)) {
            addresses.add(entry.toLowerCase())
        } else if (entry.toLowerCase().endsWith('.eth')) {
            const resolved = await resolveEns(entry)
            if (resolved) {
                addresses.add(resolved.toLowerCase())
            } else {
                unresolved.push(entry)
            }
        } else {
            // Non-address handles (e.g. github:username) have no on-chain
            // address; keep the bare github username (the devcon project
            // verifies against the username without the "github:" prefix).
            handles.add(entry.replace(/^github:/i, ''))
        }
    }

    const uniques = [...addresses, ...handles]
    console.log(`Inputs: ${entries.size} entries from ${INPUT_FILES.length} files`)
    console.log(`Output: ${addresses.size} unique addresses + ${handles.size} github handles = ${uniques.length}`)
    if (unresolved.length) console.log(`ENS unresolved (${unresolved.length}): ${unresolved.join(', ')}`)

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniques, null, 2), 'utf-8')
    console.log(`Wrote ${OUTPUT_FILE}`)
}

// Forward-resolve an ENS name to its address. Returns null if it has no address.
async function resolveEns(name: string): Promise<string | null> {
    try {
        const response = await fetch(`${ENS_RESOLVER}${name}/`)
        if (!response.ok) return null
        const data = (await response.json()) as { address?: string | null }
        await new Promise((r) => setTimeout(r, 100))
        return data.address && /^0x[0-9a-fA-F]{40}$/.test(data.address) ? data.address : null
    } catch {
        return null
    }
}
