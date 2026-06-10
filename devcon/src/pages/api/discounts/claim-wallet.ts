import type { NextApiRequest, NextApiResponse } from 'next'
import { SiweMessage } from 'siwe'
import { GetDiscount } from './validate/[id]'
import { issueVoucher, DiscountSoldOutError } from 'services/discountStore'
import { discountCollection, discountItem } from 'config/ticketing'

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

  const { message, signature, discountType } = req.body || {}
  if (!message || !signature || !discountType) {
    return res.status(400).json({ success: false, error: 'Missing message, signature, or discountType' })
  }
  if (!ALLOWED_TYPES.includes(discountType)) {
    return res.status(400).json({ success: false, error: 'Invalid discountType' })
  }

  // Verify the signature corresponds to the address embedded in the message.
  // We don't pin domain/nonce here: the claim is idempotent per (address, type)
  // — a replayed signature just re-fetches the same voucher for the same
  // wallet — so the only property we need is proof of address control.
  let address: string
  try {
    const siwe = new SiweMessage(message)
    const result = await siwe.verify({ signature })
    if (!result.success || !result.data?.address) {
      return res.status(401).json({ success: false, error: 'Invalid signature' })
    }
    address = result.data.address
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid signature' })
  }

  const data = GetDiscount(address)
  const entry = data.discounts.find(d => d.type === discountType)
  if (!entry) {
    return res.status(403).json({ success: false, error: 'Wallet not eligible for this discount' })
  }

  const itemId = discountItem(discountType)
  if (!itemId) {
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
      return res.status(409).json({ success: false, error: 'Sorry, this discount is now sold out.' })
    }
    console.error('claim-wallet issueVoucher failed:', err)
    return res.status(502).json({ success: false, error: 'Could not issue voucher. Please try again.' })
  }
  if (!voucher) {
    return res.status(502).json({ success: false, error: 'Could not issue voucher. Please try again.' })
  }

  return res.status(200).json({
    success: true,
    data: { voucher: voucher.code, discountType, discount: entry.discount },
  })
}
