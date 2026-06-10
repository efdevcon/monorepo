// Best-effort Devfolio profile + hackathon stats for a builder, scraped from the
// public profile page's embedded React Query cache (__NEXT_DATA__). No public
// API, so this is HTML-scraping — returns null on any error / markup change.

export interface DevfolioInfo {
  username: string
  profileUrl: string
  name?: string
  bio?: string
  imageUrl?: string
  hackathonsAttended: number
  hackathonsOrganized: number
  projectsBuilt: number
  prizesWon: number
  onchainCreds: number
  skills: string[]
  /** GitHub username linked on the Devfolio profile (lowercased), if any. */
  github?: string
  /** True when the Devfolio-linked GitHub matches the applicant's connected login.
   *  Set by the caller, which knows the applicant's verified login. */
  githubVerified?: boolean
}

function parseUsername(url: string): string | null {
  const m = url.match(/devfolio\.co\/@?([A-Za-z0-9_-]+)/i)
  return m ? m[1] : null
}

const num = (v: unknown): number => (typeof v === 'number' ? v : Number(v) || 0)

export async function getDevfolioProfile(url: string): Promise<DevfolioInfo | null> {
  const username = url ? parseUsername(url) : null
  if (!username) return null
  try {
    const res = await fetch(`https://devfolio.co/@${username}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; devcon-builder-form)', Accept: 'text/html' },
    })
    if (!res.ok) return null
    const html = await res.text()
    const m = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
    if (!m) return null
    const data: any = JSON.parse(m[1])
    const queries = data?.props?.pageProps?.dehydratedState?.queries
    if (!Array.isArray(queries)) return null

    const profileQ = queries.find((q: any) => q?.queryKey?.[0] === 'userPublicProfile')
    const statsQ = queries.find((q: any) => q?.queryKey?.[0] === 'userDevfolioStats')
    let u: any = profileQ?.state?.data?.users
    if (Array.isArray(u)) u = u[0]
    const s: any = statsQ?.state?.data ?? {}
    if (!u && !statsQ) return null

    const skills = Array.isArray(u?.skills)
      ? u.skills.map((x: any) => x?.skill?.name).filter(Boolean).slice(0, 12)
      : []
    const name = [u?.first_name, u?.last_name].filter(Boolean).join(' ') || undefined

    // Connected GitHub account from the profile's linked `profiles`.
    let github: string | undefined
    if (Array.isArray(u?.profiles)) {
      for (const p of u.profiles) {
        if (p?.profile?.name === 'GitHub' && typeof p?.value === 'string') {
          const gm = p.value.match(/github\.com\/([A-Za-z0-9_-]+)/i)
          if (gm) {
            github = gm[1].toLowerCase()
            break
          }
        }
      }
    }

    return {
      username,
      profileUrl: `https://devfolio.co/@${username}`,
      name,
      bio: u?.short_bio || u?.bio || undefined,
      imageUrl: u?.profile_image || undefined,
      hackathonsAttended: num(s.hackathons_attended),
      hackathonsOrganized: num(s.hackathons_organized),
      projectsBuilt: num(s.projects_built),
      prizesWon: num(s.prizes_won),
      onchainCreds: num(s.onchain_creds_claimed),
      skills,
      github,
    }
  } catch {
    return null
  }
}
