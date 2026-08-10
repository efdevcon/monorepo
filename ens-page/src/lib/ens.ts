import { createPublicClient, fallback, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import { SOCIAL_KEYS } from './socials'

// Alchemy (domain-allowlisted key, safe to embed) first when configured,
// then free public RPCs. The publics double as the fallback for origins
// outside the allowlist (IPFS gateway previews, local dev, node scripts),
// where Alchemy rejects the request and viem falls through.
// Optional chaining: import.meta.env only exists under Vite, not in the
// node-run test scripts.
const alchemyKey = import.meta.env?.VITE_ALCHEMY_KEY as string | undefined

const client = createPublicClient({
  chain: mainnet,
  transport: fallback([
    ...(alchemyKey ? [http(`https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`)] : []),
    http('https://ethereum-rpc.publicnode.com'),
    http('https://eth.llamarpc.com'),
    http('https://cloudflare-eth.com'),
  ]),
})

export interface EnsProfile {
  name: string
  displayName: string
  avatar: string | null
  header: string | null
  description: string | null
  url: string | null
  socials: { key: string; value: string }[]
}

const PROFILE_KEYS = ['name', 'header', 'description', 'url'] as const

export async function fetchEnsProfile(rawName: string): Promise<EnsProfile> {
  const name = normalize(rawName)
  const keys = [...PROFILE_KEYS, ...SOCIAL_KEYS]

  // getEnsText returns null for missing records; per-key catch demotes a
  // single flaky read to "record absent" instead of failing the whole page.
  const [avatar, values] = await Promise.all([
    client.getEnsAvatar({ name }).catch(() => null),
    Promise.all(keys.map(key => client.getEnsText({ name, key }).catch(() => null))),
  ])

  const record = new Map(keys.map((key, i) => [key as string, values[i]]))
  const text = (key: string) => {
    const v = record.get(key)?.trim()
    return v ? v : null
  }

  const headerRaw = text('header')
  return {
    name,
    displayName: text('name') ?? name,
    avatar: avatar ?? null,
    // Only http(s) header values are renderable as <img> src; NFT-style
    // references (eip155:...) have no public resolver for header images.
    header: headerRaw && /^https?:\/\//i.test(headerRaw) ? headerRaw : null,
    description: text('description'),
    url: text('url'),
    socials: SOCIAL_KEYS.flatMap(key => {
      const value = text(key)
      return value ? [{ key, value }] : []
    }),
  }
}
