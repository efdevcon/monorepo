/**
 * Build src/data/devcon-poap-attendees.json — a map of
 *   lowercased wallet address -> [past Devcon/Devconnect event labels]
 * from the per-event POAP holder CSVs in the sibling `discounts` repo
 * (../discounts/inputs/POAP_drop_<id>_<slug>.csv, one address per line).
 *
 * Run from the devcon repo root: npx tsx src/scripts/builder/build-poap-attendees.ts
 */
import fs from 'fs'
import path from 'path'

const INPUTS_DIR = path.resolve(process.cwd(), '../discounts/inputs')
const OUT_FILE = path.resolve(process.cwd(), 'src/data/devcon-poap-attendees.json')

// Map the filename slug (POAP_drop_<id>_<slug>.csv) to a human label.
const LABELS: Record<string, string> = {
  'devcon-1': 'Devcon I',
  'devcon-2': 'Devcon II',
  'devcon-3': 'Devcon III',
  'devcon-4': 'Devcon IV',
  'devcon-5': 'Devcon V',
  'devcon-bogota': 'Devcon VI (Bogotá)',
  'devcon-sea': 'Devcon VII (SEA)',
  'devconnect-ams': 'Devconnect Amsterdam',
  'devconnect-ist': 'Devconnect Istanbul',
  'devconnect-arg': 'Devconnect Argentina',
}

function slugFromFilename(name: string): string | null {
  // POAP_drop_69_devcon-5.csv -> devcon-5
  const m = name.match(/^POAP_drop_\d+_(.+)\.csv$/i)
  return m ? m[1] : null
}

function main() {
  if (!fs.existsSync(INPUTS_DIR)) {
    console.error(`Inputs dir not found: ${INPUTS_DIR} (expected the sibling discounts repo)`)
    process.exit(1)
  }
  const files = fs.readdirSync(INPUTS_DIR).filter(f => /^POAP_drop_\d+_.+\.csv$/i.test(f))
  const map: Record<string, string[]> = {}

  for (const file of files) {
    const slug = slugFromFilename(file)
    if (!slug) continue
    const label = LABELS[slug] ?? slug
    const lines = fs.readFileSync(path.join(INPUTS_DIR, file), 'utf8').split(/\r?\n/)
    let count = 0
    for (const line of lines) {
      const addr = line.trim().toLowerCase()
      if (!/^0x[a-f0-9]{40}$/.test(addr)) continue
      if (!map[addr]) map[addr] = []
      if (!map[addr].includes(label)) map[addr].push(label)
      count++
    }
    console.log(`  ${file} -> "${label}": ${count} addresses`)
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(map))
  console.log(`Wrote ${Object.keys(map).length} addresses -> ${OUT_FILE}`)
}

main()
