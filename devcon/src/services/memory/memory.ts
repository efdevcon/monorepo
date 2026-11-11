import type { Address, Hex } from 'viem'

/**
 * Devcon 8 Memory on devcon.org: a free NFT for every checked-in Devcon 8
 * ticket, claimed with the code emailed to its attendee and minted to the
 * wallet the person connected in the survey (`[memory]` form field). Minted
 * on Ethereum by this server with sponsored gas (api/memory). Shared by the
 * route and the field; nothing here touches env or Node APIs.
 *
 * It is one edition of the Devcon Memories collection: one contract, an
 * edition per occasion (a volunteers' edition, Devcon 9...), each with its own
 * names, art and traits. Token ids carry the edition (MEMORY_EDITION_SIZE).
 * The same ticket-key scheme as the event app's perk (stashed there), so a
 * ticket gets one memory whichever way it is claimed.
 */

export type MemoryChain = 'sepolia' | 'mainnet'

/** Where memories are minted. Sepolia until the mainnet contract is deployed. */
export const MEMORY_CHAIN: MemoryChain = 'sepolia'

export const MEMORY_CHAINS: Record<MemoryChain, { id: number; contract: Address | null; explorer: string }> = {
  sepolia: {
    id: 11155111,
    contract: '0x08b61EC41d039D1c8735007b57D1DA97dB533E43',
    explorer: 'https://sepolia.etherscan.io',
  },
  mainnet: { id: 1, contract: null, explorer: 'https://etherscan.io' },
}

/** Devcon 8's edition in the Devcon Memories contract (editions are numbered in the order they were added). */
export const MEMORY_EDITION = 1

/** Token ids per edition in the contract: edition 1's tokens are 1000001, 1000002... */
export const MEMORY_EDITION_SIZE = 1_000_000

/** A token's number within its edition, as its name shows it ("Devcon 8 Memory #12"). */
export function memoryNumber(tokenId: number): number {
  return tokenId % MEMORY_EDITION_SIZE
}

/** The art: a still before, the spin while minting, the lit loop after. */
export const MEMORY_MEDIA = {
  still: '/memory/still-1080.webp',
  spin: '/memory/spin-810.mp4',
  memory: '/memory/memory-810.mp4',
  poster: '/memory/devcon8-memory-poster.webp',
} as const

// The animation keeps time with real Ethereum slots: one turn per slot.
export const SLOT_SECONDS = 12
/** Beacon chain genesis (mainnet), in seconds. */
export const BEACON_GENESIS = 1606824023

/** Position within the current slot, 0 at a slot boundary, approaching 1 just before the next. */
export function slotPhase(nowMs: number): number {
  const s = nowMs / 1000 - BEACON_GENESIS
  return (((s % SLOT_SECONDS) + SLOT_SECONDS) % SLOT_SECONDS) / SLOT_SECONDS
}

/** The beacon chain slot at this moment. */
export function slotNumber(nowMs: number): number {
  return Math.floor((nowMs / 1000 - BEACON_GENESIS) / SLOT_SECONDS)
}

/** Milliseconds until the next slot boundary, in (0, 12000]. */
export function msToNextSlot(nowMs: number): number {
  return Math.round((1 - slotPhase(nowMs)) * SLOT_SECONDS * 1000)
}

/**
 * Claim codes: 10 characters of Crockford base32 (no I, L, O, U), shown as
 * two groups of five. Typing is forgiving: case, spaces and dashes are
 * ignored, and the letters people confuse with digits are read as digits.
 */
export const CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 10

/** The canonical code (10 characters, no dash), or null when it can't be one. */
export function normalizeCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  if (code.length !== CODE_LENGTH) return null
  return [...code].every(c => CODE_ALPHABET.includes(c)) ? code : null
}

/** "ABCDE-FGHJK". */
export function formatCode(code: string): string {
  return `${code.slice(0, 5)}-${code.slice(5)}`
}

/** One ticket's memory as the survey field sees it. */
export type MemoryState =
  | { state: 'none' }
  | {
      state: 'minting'
      /** queued: waiting for the next batch; submitted: sent to Ethereum, waiting for a block. */
      step: 'queued' | 'submitted'
      /** A send already failed and the mint is being retried. */
      retrying: boolean
      recipient: Address
    }
  | {
      state: 'minted'
      recipient: Address
      tokenId: number
      txHash: Hex | null
      blockNumber: number | null
      chainId: number
    }
  | {
      state: 'failed'
      recipient: Address
      /** Why the last send failed, as the bundler put it. */
      reason: string | null
    }

export function chainById(chainId: number): (typeof MEMORY_CHAINS)[MemoryChain] | null {
  return Object.values(MEMORY_CHAINS).find(c => c.id === chainId) ?? null
}

/** Etherscan page of the mint transaction, when known. */
export function memoryTxUrl(m: { chainId: number; txHash: Hex | null }): string | null {
  const chain = chainById(m.chainId)
  return chain && m.txHash ? `${chain.explorer}/tx/${m.txHash}` : null
}

/**
 * Where to see the NFT itself: OpenSea on mainnet; on Sepolia, Etherscan's NFT
 * page (OpenSea dropped testnets).
 */
export function memoryNftLink(m: { chainId: number; tokenId: number }): { label: string; url: string } | null {
  const chain = chainById(m.chainId)
  if (!chain?.contract) return null
  if (m.chainId === MEMORY_CHAINS.mainnet.id) {
    return { label: 'View on OpenSea', url: `https://opensea.io/item/ethereum/${chain.contract}/${m.tokenId}` }
  }
  return { label: 'View NFT', url: `${chain.explorer}/nft/${chain.contract}/${m.tokenId}` }
}

/**
 * What a person reads when their mint failed. A sponsorship refusal (a policy
 * limit, the paymaster) is on our side and passes once fixed, so it says so
 * rather than inviting retries that cannot work yet.
 */
export function memoryFailureMessage(reason: string | null): string {
  if (reason && /sponsor|paymaster|policy/i.test(reason)) {
    return 'Minting is paused for a moment on our side. Please try again in a few minutes.'
  }
  return "That mint didn't go through. Please try again."
}

/** "0xbc99…d89e". */
export function shortHash(hash: string): string {
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`
}
