import fs from 'fs'
import path from 'path'

const INPUT_DIR = 'inputs'
// Hand-maintained additions (JSON array of addresses): past attendees whose
// POAP sits in a wallet they cannot connect (e.g. POAP's embedded wallets),
// added after support verified them. Merged after the drop CSVs.
const MANUAL_FILE = 'inputs/poap-manual.json'
const OUTPUT_FILE = 'outputs/poap-past-attendees.json'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

parse()

// Merge every POAP_drop_*.csv (one address per line, produced by poap-fetch.ts)
// into a single de-duplicated list of past attendee addresses.
function parse() {
    const files = fs
        .readdirSync(INPUT_DIR)
        .filter((f) => f.startsWith('POAP_drop_') && f.endsWith('.csv'))
        .sort()

    const uniques = new Set<string>()

    for (const file of files) {
        const addresses = fs
            .readFileSync(path.join(INPUT_DIR, file), 'utf-8')
            .split('\n')
            .map((line) => line.trim().toLowerCase())
            .filter((line) => line.startsWith('0x') && line !== ZERO_ADDRESS)

        for (const address of addresses) uniques.add(address)
        console.log(`${file}: ${addresses.length}`)
    }

    if (fs.existsSync(MANUAL_FILE)) {
        const manual = (JSON.parse(fs.readFileSync(MANUAL_FILE, 'utf-8')) as string[])
            .map((entry) => entry.trim().toLowerCase())
            .filter((entry) => /^0x[0-9a-f]{40}$/.test(entry) && entry !== ZERO_ADDRESS)
        for (const address of manual) uniques.add(address)
        console.log(`${path.basename(MANUAL_FILE)}: ${manual.length}`)
    }

    const result = [...uniques]
    console.log(`\n${files.length} drops, ${result.length} unique addresses`)
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`wrote ${OUTPUT_FILE}`)
}
