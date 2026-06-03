/**
 * Server-side ENS avatar resolution, shared by:
 *   - the OG card route (`/api/ticket/[...slug]`) — embeds bytes as a data URL
 *   - the on-page avatar proxy (`/api/ens-avatar/[name]`) — streams bytes to <img>
 *
 * Resolving + fetching the bytes server-side (rather than handing a raw upstream
 * URL to the browser) is what makes the avatar reliable: it sidesteps client-side
 * CORS, hotlink protection, IPFS/Arweave gateway flakiness, and the HEAD-OK /
 * GET-fails mismatch that caused the on-page avatar to fall back to a placeholder.
 */

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ATTEMPT_TIMEOUT_MS = 4000

export function isEnsName(name: string): boolean {
  return /\.eth$/i.test(name.trim())
}

// Fetches image bytes from a URL with one retry on transient failure.
// `transient: false` means definitive (404 / success / oversized); any other
// failure surfaces as transient so callers can skip caching and retry later.
async function fetchImageBytes(
  url: string,
  timeoutMs: number
): Promise<{ bytes: Buffer | null; transient: boolean }> {
  let transient = false
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
      if (res.status === 404) return { bytes: null, transient: false }
      if (!res.ok) {
        transient = true
        continue
      }
      const contentLength = Number(res.headers.get('content-length') || 0)
      if (contentLength > MAX_AVATAR_BYTES) return { bytes: null, transient: false }
      const bytes = Buffer.from(await res.arrayBuffer())
      if (bytes.length === 0 || bytes.length > MAX_AVATAR_BYTES) {
        transient = true
        continue
      }
      return { bytes, transient: false }
    } catch {
      transient = true
    }
  }
  return { bytes: null, transient }
}

// Tier 1: ensdata.net runs its own resolver + avatar CDN, so it often serves
// when metadata.ens.domains is having a bad minute.
async function fetchEnsdataAvatarBytes(
  normalizedName: string
): Promise<{ bytes: Buffer | null; transient: boolean }> {
  const candidates: string[] = []
  try {
    const res = await fetch(`https://ensdata.net/${encodeURIComponent(normalizedName)}`, {
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    })
    if (res.status === 404) return { bytes: null, transient: false }
    if (!res.ok) return { bytes: null, transient: true }
    const data = (await res.json()) as { avatar_small?: string; avatar?: string }
    if (data.avatar_small) candidates.push(data.avatar_small)
    if (data.avatar && data.avatar !== data.avatar_small) candidates.push(data.avatar)
  } catch {
    return { bytes: null, transient: true }
  }
  if (candidates.length === 0) return { bytes: null, transient: false }
  for (const url of candidates) {
    const result = await fetchImageBytes(url, ATTEMPT_TIMEOUT_MS)
    if (result.bytes) return result
  }
  return { bytes: null, transient: true }
}

/**
 * Resolves the raw avatar bytes for an ENS name with tier-1 (ensdata.net) →
 * tier-2 (ENS metadata gateway) fallback. ensdata serves a pre-sized avatar
 * from its own CDN (usually faster); the gateway is the canonical resolver and
 * handles every avatar record format, so we treat its 404 as authoritative
 * ("no on-chain avatar record" → safe to cache the miss).
 *
 * Returns `bytes: null, transient: true` when both tiers had a recoverable
 * failure (so the caller should NOT cache and should retry on the next hit),
 * or `bytes: null, transient: false` when the name genuinely has no avatar.
 */
export async function fetchEnsAvatarBytes(name: string): Promise<{ bytes: Buffer | null; transient: boolean }> {
  const normalizedName = name.trim().toLowerCase()

  const primary = await fetchEnsdataAvatarBytes(normalizedName)
  if (primary.bytes) return { bytes: primary.bytes, transient: false }

  const backup = await fetchImageBytes(
    `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(normalizedName)}`,
    ATTEMPT_TIMEOUT_MS
  )
  if (backup.bytes) return { bytes: backup.bytes, transient: false }

  // Both failed. Defer to the canonical gateway's transient flag.
  return { bytes: null, transient: backup.transient }
}
