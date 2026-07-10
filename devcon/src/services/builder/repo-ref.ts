/** Normalize a repo reference (URL, github.com/x/y, or owner/name) to lowercased "owner/name", or null. */
export function normalizeRepoRef(input: string): string | null {
  if (!input) return null
  let s = input.trim()
  if (!s) return null
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '')
  s = s.replace(/^github\.com\//i, '')
  const parts = s.split('/').filter(Boolean)
  if (parts.length < 2) return null
  const owner = parts[0]
  const name = parts[1].replace(/\.git$/i, '')
  if (!owner || !name) return null
  if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return null
  return `${owner}/${name}`.toLowerCase()
}

/** Parse a free-text list (newlines/commas) of repo refs into a deduped, normalized array. */
export function parseRepoList(input: string | null | undefined): string[] {
  if (!input) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const token of input.split(/[\n,]+/)) {
    const ref = normalizeRepoRef(token)
    if (ref && !seen.has(ref)) {
      seen.add(ref)
      out.push(ref)
    }
  }
  return out
}
