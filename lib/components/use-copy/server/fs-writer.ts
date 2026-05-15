import fs from 'fs'
import path from 'path'

/**
 * Resolve `${basePath}/${key}.json` and confirm the result still lives under
 * `basePath`. Pre-fix code passed `key` straight to `path.resolve` which
 * silently absorbs absolute paths (`/tmp/probe`) and `..` traversal segments,
 * letting a caller write outside `basePath`. Returns null on traversal so
 * callers can short-circuit with a 400.
 */
function resolveOverridePath(basePath: string, key: string): string | null {
  if (typeof key !== 'string' || !key) return null
  // Reject absolute keys and segments that contain explicit traversal — even
  // though startsWith() below catches escapes, rejecting up-front gives a
  // clearer signal in logs.
  if (path.isAbsolute(key) || key.includes('\0')) return null
  const root = path.resolve(basePath)
  const filePath = path.resolve(root, `${key}.json`)
  if (filePath !== `${root}.json` && !filePath.startsWith(root + path.sep)) {
    return null
  }
  return filePath
}

export function readOverrides(basePath: string, key: string): Record<string, any> | null {
  const filePath = resolveOverridePath(basePath, key)
  if (!filePath) return null

  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export class CopyPathTraversalError extends Error {
  constructor() {
    super('invalid key (path traversal blocked)')
    this.name = 'CopyPathTraversalError'
  }
}

export function writeOverrides(basePath: string, key: string, data: Record<string, any>): void {
  const filePath = resolveOverridePath(basePath, key)
  if (!filePath) throw new CopyPathTraversalError()
  const dir = path.dirname(filePath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

export function setNestedValue(obj: Record<string, any>, dotPath: string, value: any): void {
  const keys = dotPath.split('.')
  // Reject prototype-pollution segments before walking. setting `__proto__`
  // on a freshly-created plain object aliases all object prototypes.
  for (const k of keys) {
    if (DANGEROUS_KEYS.has(k)) {
      throw new Error(`invalid path segment: ${k}`)
    }
  }
  let current = obj

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }

  current[keys[keys.length - 1]] = value
}
