import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { readManifest, writeManifest, walkSource, computeDiff } from './translate/manifest'
import { translateJson } from './translate/translate-json'
import { translateMdx } from './translate/translate-mdx'
import { SOURCE_LOCALE, TARGET_LOCALES } from './translate/locales'

const CONTENT_ROOT = path.resolve(__dirname, '../../content')
const MANIFEST_PATH = path.join(CONTENT_ROOT, '.manifest.json')

async function main() {
  if (!process.env.OPEN_AI_KEY) {
    console.error('OPEN_AI_KEY env var is required')
    process.exit(1)
  }

  const sourceRoot = path.join(CONTENT_ROOT, SOURCE_LOCALE)
  if (!fs.existsSync(sourceRoot)) {
    console.error(`Source root not found: ${sourceRoot}`)
    process.exit(1)
  }

  const manifest = readManifest(MANIFEST_PATH)
  const files = walkSource(sourceRoot)
  const { changed, deleted } = computeDiff(files, manifest)

  console.log(`Found ${files.length} source files. ${changed.length} changed, ${deleted.length} deleted.`)

  for (const rel of deleted) {
    for (const locale of TARGET_LOCALES) {
      const target = path.join(CONTENT_ROOT, locale, rel)
      if (fs.existsSync(target)) {
        fs.unlinkSync(target)
        console.log(`  deleted ${locale}/${rel}`)
      }
    }
    delete manifest[rel]
  }

  if (changed.length === 0 && deleted.length === 0) {
    console.log('Nothing to translate. Manifest unchanged.')
    writeManifest(MANIFEST_PATH, manifest)
    return
  }

  const filesByPath = new Map(files.map(f => [f.relativePath, f]))

  for (const rel of changed) {
    const file = filesByPath.get(rel)!
    const ext = path.extname(rel).toLowerCase()
    const source = fs.readFileSync(file.absolutePath, 'utf-8')

    const localeResults: Array<{ locale: string; translated: string }> = []
    let anyFailed = false

    for (const locale of TARGET_LOCALES) {
      try {
        const translated =
          ext === '.json' ? await translateJson(source, locale) : await translateMdx(source, locale)
        localeResults.push({ locale, translated })
        console.log(`  ok ${locale}/${rel}`)
      } catch (err) {
        anyFailed = true
        console.error(`  fail ${locale}/${rel}:`, err instanceof Error ? err.message : err)
      }
    }

    if (anyFailed) {
      console.error(`Skipping manifest update for ${rel}; will retry next run.`)
      continue
    }

    for (const { locale, translated } of localeResults) {
      const target = path.join(CONTENT_ROOT, locale, rel)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, translated)
    }

    manifest[rel] = file.hash
  }

  writeManifest(MANIFEST_PATH, manifest)
  console.log('Done.')
}

main().catch(err => {
  console.error('translate-content failed:', err)
  process.exit(1)
})
