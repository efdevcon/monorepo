import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'

export type Manifest = Record<string, string>

export interface SourceFile {
  relativePath: string
  absolutePath: string
  hash: string
}

export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

export function readManifest(manifestPath: string): Manifest {
  if (!fs.existsSync(manifestPath)) return {}
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch {
    return {}
  }
}

export function writeManifest(manifestPath: string, manifest: Manifest) {
  const sorted: Manifest = {}
  for (const key of Object.keys(manifest).sort()) sorted[key] = manifest[key]
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true })
  fs.writeFileSync(manifestPath, JSON.stringify(sorted, null, 2) + '\n')
}

const SUPPORTED_EXTS = new Set(['.mdx', '.md', '.json'])

export function walkSource(sourceRoot: string): SourceFile[] {
  const files: SourceFile[] = []

  function walk(current: string) {
    if (!fs.existsSync(current)) return
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const abs = path.join(current, entry.name)
      if (entry.isDirectory()) {
        walk(abs)
      } else if (entry.isFile() && SUPPORTED_EXTS.has(path.extname(entry.name))) {
        const content = fs.readFileSync(abs, 'utf-8')
        files.push({
          relativePath: path.relative(sourceRoot, abs),
          absolutePath: abs,
          hash: hashContent(content),
        })
      }
    }
  }

  walk(sourceRoot)
  return files
}

export function computeDiff(files: SourceFile[], manifest: Manifest) {
  const currentByPath = new Map(files.map(f => [f.relativePath, f]))
  const changed = files.filter(f => manifest[f.relativePath] !== f.hash).map(f => f.relativePath)
  const deleted = Object.keys(manifest).filter(p => !currentByPath.has(p))
  return { changed, deleted }
}
