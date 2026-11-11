import { useEffect, useState } from 'react'
import { createPublicClient, fallback, getAddress, http, isAddress } from 'viem'
import { mainnet } from 'viem/chains'

const ALCHEMY_KEY = process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || ''

/**
 * Mainnet reads for ENS: the public Alchemy key first (it only answers
 * devcon.org origins, not localhost), then two public RPCs. viem's default
 * public RPC is rate limited, so it isn't used. Short timeouts and no retries:
 * the name is cosmetic, and a refused RPC should hand over at once.
 */
function makeClient() {
  const rpc = (url: string) => http(url, { timeout: 5_000, retryCount: 0 })
  return createPublicClient({
    chain: mainnet,
    transport: fallback([
      ...(ALCHEMY_KEY ? [rpc(`https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`)] : []),
      rpc('https://ethereum-rpc.publicnode.com'),
      rpc('https://eth.drpc.org'),
    ]),
  })
}
let client: ReturnType<typeof makeClient> | undefined

// One lookup per address per page, shared by every component that shows it.
const lookups = new Map<string, Promise<string | null>>()

/**
 * The address's primary ENS name: its reverse record, which viem checks
 * against the name's forward record, so nobody can claim someone else's
 * address. Null when none is set or the lookup fails.
 */
export function lookupPrimaryEnsName(address: string): Promise<string | null> {
  if (!isAddress(address)) return Promise.resolve(null)
  const key = getAddress(address)
  let lookup = lookups.get(key)
  if (!lookup) {
    client ??= makeClient()
    lookup = client.getEnsName({ address: key }).catch(() => null)
    lookups.set(key, lookup)
  }
  return lookup
}

/** The primary ENS name for `address`, or null while loading and when there is none. */
export function usePrimaryEnsName(address?: string | null): string | null {
  const [name, setName] = useState<{ address: string; name: string | null } | null>(null)
  useEffect(() => {
    if (!address) return
    let cancelled = false
    lookupPrimaryEnsName(address).then(found => {
      if (!cancelled) setName({ address, name: found })
    })
    return () => {
      cancelled = true
    }
  }, [address])
  return address && name?.address === address ? name.name : null
}

/** 0x1234…cdef */
export function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address
}

/** The primary ENS name when there is one, else the short address. */
export function useWalletLabel(address?: string | null): string | null {
  const ensName = usePrimaryEnsName(address)
  return address ? ensName ?? shortAddress(address) : null
}
