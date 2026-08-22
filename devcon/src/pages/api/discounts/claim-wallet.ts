import type { NextApiRequest, NextApiResponse } from 'next'
import { SiweMessage } from 'siwe'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { GetDiscount } from './validate/[id]'
import { issueVoucher, DiscountSoldOutError } from 'services/discountStore'
import { discountCollection, discountItem } from 'config/ticketing'
import { verifyProof } from 'services/builder/proof'

// Mainnet client for signature verification. Needed on-chain: ERC-1271
// signatures resolve via the wallet contract's `isValidSignature`, so
// smart-contract wallets (Safe & co) can claim too.
const viemClient = createPublicClient({
  chain: mainnet,
  transport: http(`https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_APIKEY}`),
})

// The SIWE signature is a pure wallet-ownership proof (no on-chain tx), so we
// pin it to a single chain id. This closes the M26 cross-chain replay: a
// signature the wallet produced on another chain won't validate here.
const EXPECTED_CHAIN_ID = 1

// Wallet-claimable community discounts issued through this endpoint. Core Devs
// is included because its allowlist (core-devs.json) holds ETH addresses as
// well as GitHub usernames, so a wallet can be eligible. OSS Contributors is
// GitHub-username-only and is claimed via the session flow
// (/api/discounts/claim/[id]) instead.
const ALLOWED_TYPES = ['past-attendees', 'pg-projects', 'core-devs'] as const

/**
 * Claim a community discount voucher with a connected wallet.
 *
 * Unlike `/api/discounts/claim/[id]` (which requires a full NextAuth SIWE
 * session and always issues `discounts[0]`), this endpoint verifies a SIWE
 * signature inline. The voucher is created on the fly via `issueVoucher`, which
 * enforces one voucher per identity globally and re-shares the same code if the
 * wallet returns.
 *
 * The signature proves the caller controls the address: the eligibility lookup
 * (`/api/discounts/validate/[id]`) is public, so without proof of control
 * anyone could claim a voucher for any allowlisted address.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  // Same exit-path logging as claim/[id]: the browser shows a generic error
  // for any non-JSON response, so these lines are the only reliable record of
  // WHY a wallet claim failed (plus timing for the timeout theory).
  const t0 = Date.now()
  const exit = (reason: string) => console.log(`[claim-wallet] ${reason} in ${Date.now() - t0}ms`)

  const { message, signature, discountType, nonceToken } = req.body || {}
  if (!message || !signature || !discountType || !nonceToken) {
    exit('400 missing fields')
    return res.status(400).json({ success: false, error: 'Missing message, signature, discountType, or nonceToken' })
  }
  if (!ALLOWED_TYPES.includes(discountType)) {
    exit(`400 invalid type ${discountType}`)
    return res.status(400).json({ success: false, error: 'Invalid discountType' })
  }

  // M25/M26: fully bind the SIWE verification so a signature is only valid for
  // THIS site, a nonce WE issued, this chain, and within its expiry — otherwise
  // any signature the listed wallet ever produced elsewhere replays into voucher
  // theft. `nonceToken` is a short-lived server-signed token from
  // /api/discounts/claim-wallet-nonce (the client echoes it back); its embedded
  // nonce must match the one in the signed message.
  if (verifyProof(nonceToken, 'wallet') !== 'nonce') {
    exit('401 bad nonce token')
    return res.status(401).json({ success: false, error: 'Invalid or expired nonce' })
  }
  const expectedNonce = String(nonceToken).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32)

  // Bind to our host (anti-phishing): a SIWE message solicited for another
  // domain won't verify. Prefer NEXTAUTH_URL; fall back to the request host.
  let expectedDomain: string | undefined
  try {
    expectedDomain = process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).host : undefined
  } catch {
    expectedDomain = undefined
  }
  if (!expectedDomain && typeof req.headers.host === 'string') expectedDomain = req.headers.host

  let address: string
  try {
    const siwe = new SiweMessage(message)
    // A message with no expiry would be a perpetual token even with `time` set.
    if (!siwe.expirationTime) {
      exit('401 no expiration in message')
    return res.status(401).json({ success: false, error: 'Signature message must set an expiration time' })
    }
    if (siwe.chainId !== EXPECTED_CHAIN_ID) {
      exit('401 wrong chain')
    return res.status(401).json({ success: false, error: 'Unexpected signature chain' })
    }
    // Field bindings previously enforced inside siwe.verify() — kept explicit:
    if (siwe.nonce !== expectedNonce) {
      // kills replay of signatures made for another context
      exit('401 nonce mismatch')
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }
    if (expectedDomain && siwe.domain !== expectedDomain) {
      // kills cross-site replay
      exit('401 domain mismatch')
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }
    if (new Date(siwe.expirationTime).getTime() < Date.now()) {
      exit('401 message expired')
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }
    // Signature check via viem's universal verifier: EOA ecrecover first,
    // then on-chain ERC-1271 `isValidSignature` for smart-contract wallets
    // (and ERC-6492 for undeployed ones). The `siwe` library's verify() was
    // EOA-only and rejected Safe multisig signatures — Protocol Guild's
    // wallet of choice (found live 2026-08-22: a 2-of-N Safe returned a
    // 130-byte concatenated signature that verifies fine via ERC-1271).
    const valid = await viemClient.verifyMessage({
      address: siwe.address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    })
    if (!valid) {
      exit('401 invalid signature')
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }
    address = siwe.address
  } catch {
    exit('401 invalid signature')
    return res.status(401).json({ success: false, error: 'Invalid signature' })
  }

  const data = GetDiscount(address)
  const entry = data.discounts.find(d => d.type === discountType)
  if (!entry) {
    exit(`403 not eligible (type=${discountType})`)
    return res.status(403).json({ success: false, error: 'Wallet not eligible for this discount' })
  }

  const itemId = discountItem(discountType)
  if (!itemId) {
    exit(`400 no item for type=${discountType}`)
    return res.status(400).json({ success: false, error: 'This discount is not configured.' })
  }

  // Issue a single-use voucher that unlocks the discount ticket. Global
  // one-per-identity: a wallet that already holds any community voucher gets
  // that same code back instead of a new one.
  let voucher: Awaited<ReturnType<typeof issueVoucher>> = null
  try {
    voucher = await issueVoucher(address.toLowerCase(), itemId, discountCollection(discountType), {
      tag: discountType,
      type: discountType,
    })
  } catch (err) {
    if (err instanceof DiscountSoldOutError) {
      exit(`409 sold out (type=${discountType})`)
      return res.status(409).json({ success: false, error: 'Sorry, this discount is now sold out.' })
    }
    console.error('claim-wallet issueVoucher failed:', err)
    exit('502 issueVoucher failed')
    return res.status(502).json({ success: false, error: 'Could not issue voucher. Please try again.' })
  }
  if (!voucher) {
    exit('502 issueVoucher failed')
    return res.status(502).json({ success: false, error: 'Could not issue voucher. Please try again.' })
  }

  exit(`200 voucher issued (type=${discountType})`)

  return res.status(200).json({
    success: true,
    data: { voucher: voucher.code, discountType, discount: entry.discount },
  })
}
