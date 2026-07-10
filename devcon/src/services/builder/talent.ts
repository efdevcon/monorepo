// Best-effort fetch of a builder's Talent Protocol profile + Builder Score for
// a wallet address, via the public talent.app API (no auth). Returns null on any
// error so callers can render "no Talent profile" gracefully.

export interface TalentSocial {
  source: string // 'github' | 'x_twitter' | 'farcaster' | 'lens'
  username: string
}

export interface TalentInfo {
  score: number | null // Builder Score points
  rank: number | null // leaderboard rank
  displayName?: string
  bio?: string
  role?: string
  location?: string
  ens?: string
  imageUrl?: string
  onchainSince?: string // ISO date — onchain tenure
  profileUrl: string
  socials: TalentSocial[]
}

const SOCIAL_SOURCES = new Set(['github', 'x_twitter', 'farcaster', 'lens'])

export async function getTalentProfile(address: string): Promise<TalentInfo | null> {
  if (!address) return null
  try {
    const [profileRes, scoreRes] = await Promise.all([
      fetch(`https://talent.app/api/profile?id=${encodeURIComponent(address)}`, { headers: { Accept: 'application/json' } }),
      fetch(`https://talent.app/api/score?id=${encodeURIComponent(address)}`, { headers: { Accept: 'application/json' } }),
    ])
    if (!profileRes.ok) return null
    const pj: any = await profileRes.json()
    const p = pj?.profile
    if (!p) return null

    let score: number | null = null
    let rank: number | null = typeof p.rank_position === 'number' ? p.rank_position : null
    if (scoreRes.ok) {
      const sj: any = await scoreRes.json()
      if (typeof sj?.score?.points === 'number') score = sj.score.points
      if (typeof sj?.score?.rank_position === 'number') rank = sj.score.rank_position
    }

    // One verified social per platform (strip the `lens/` prefix).
    const seen = new Set<string>()
    const socials: TalentSocial[] = []
    for (const a of p.accounts ?? []) {
      if (!SOCIAL_SOURCES.has(a?.source) || !a?.username || a?.revoked_at) continue
      if (seen.has(a.source)) continue
      seen.add(a.source)
      socials.push({ source: a.source, username: String(a.username).replace(/^lens\//, '') })
    }

    return {
      score,
      rank,
      displayName: p.display_name || p.name || undefined,
      bio: p.bio || undefined,
      role: p.main_role || undefined,
      location: p.location || undefined,
      ens: p.ens || undefined,
      imageUrl: p.image_url || undefined,
      onchainSince: p.onchain_since || undefined,
      profileUrl: `https://talent.app/${address}`,
      socials,
    }
  } catch {
    return null
  }
}
