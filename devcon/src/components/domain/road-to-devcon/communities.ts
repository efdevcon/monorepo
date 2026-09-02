// Road to Devcon community co-creators shown as a logo wall on /road-to-devcon.
//
// The live list comes from the NocoDB "RTD Communities Logos" table
// (services/rtd-communities.ts). This seed is only the build-time fallback used
// when NocoDB is unreachable, so the section is never empty.

export interface RoadCommunity {
  id: string
  name: string
  /** Logo URL (public Supabase Storage URL mirrored from NocoDB, or a local asset for the seed). */
  logo: string
  // null (not undefined) when missing — getStaticProps can't serialize undefined.
  url: string | null
}

// Logos live in public/road-to-devcon/communities/ — same convention the rest
// of the Road to Devcon feature uses (Hero/Programs load from here).
const ASSET_BASE = '/road-to-devcon/communities'

export const ROAD_TO_DEVCON_COMMUNITIES: RoadCommunity[] = [
  { id: 'seed-devfolio', name: 'Devfolio', logo: `${ASSET_BASE}/devfolio.png`, url: 'https://devfolio.co/discover' },
  { id: 'seed-eth-mumbai', name: 'ETH Mumbai', logo: `${ASSET_BASE}/eth-mumbai.png`, url: 'https://www.ethmumbai.in/' },
  { id: 'seed-aya', name: 'Aya', logo: `${ASSET_BASE}/aya.png`, url: 'https://theayacommunity.com/' },
  { id: 'seed-eth-pune', name: 'ETH Pune', logo: `${ASSET_BASE}/eth-pune.png`, url: 'https://www.ethpune.com/' },
]
