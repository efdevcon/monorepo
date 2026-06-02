import fs from 'fs'
import path from 'path'

const INPUT_DIR = 'inputs'
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

    const result = [...uniques]
    console.log(`\n${files.length} drops, ${result.length} unique addresses`)
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8')
    console.log(`wrote ${OUTPUT_FILE}`)
}
