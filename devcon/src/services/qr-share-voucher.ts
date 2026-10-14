/**
 * What a pasted voucher unlocks, for the QR share pages. Read-only against
 * Pretix; the redeem URL is built from the ticketing config so the same code
 * works on the dev instance (slug paths) and production (custom domain).
 */
import { TICKETING } from 'config/ticketing'
import { validateVoucher, getItem, getEvent, applyVoucherDiscount, getLocalizedString, type VoucherInfo } from './pretix'

export interface VoucherDescription {
  code: string
  title: string
  description: string | null
  /** One-line summary for tables: "$444.11 ETH · $889.11 card", "$349.00", "$349.00 ETH only". */
  price: string | null
  /** Price when paying with ETH (the Pretix item price after the voucher). */
  priceEth: string | null
  /** Price when paying by card, null when the item is ETH-only. */
  priceFiat: string | null
  targetUrl: string
  /** Used up: redemptions reached the maximum. */
  redeemed: boolean
  maxUsages: number
  redemptions: number
}
export interface VoucherUsage {
  redemptions: number
  maxUsages: number
  usedUp: boolean
}

/** A voucher is "redeemed" for the share pages once its redemptions reach
 *  the maximum (one for the single-use in-person codes). A multi-use voucher
 *  with uses left stays shareable; an unlimited one (max 0) never runs out. */
export function usedUp(redeemed: number, maxUsages: number): boolean {
  return maxUsages > 0 && redeemed >= maxUsages
}

export interface PriceInfo {
  eth: string
  /** Null when the item is ETH-only (`fiat_disabled`). Equal to `eth` when the item has no card price of its own. */
  fiat: string | null
  mode: 'both' | 'same' | 'eth'
}

const money = (amount: number, currency: string) =>
  currency === 'USD' ? `$${amount.toFixed(2)}` : `${amount.toFixed(2)} ${currency}`

/** Cents, half up, like the plugin's quantize. */
const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** The operator's `fiat_price_usd`: plain digits and dot, positive; anything else means "no card price set". */
function parseFiat(raw: string | undefined): number | null {
  const s = (raw ?? '').trim()
  if (!s || !/^[0-9.]+$/.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

/** ETH and card prices for an item under a voucher, the way the Pretix ETH
 *  plugin charges them: the item price is the ETH price; `fiat_price_usd`
 *  metadata is the list card price; a 'set' voucher makes both prices that
 *  value, 'subtract' takes the same amount off both, 'percent' and no discount
 *  scale the card price by the ratio the ETH price moved. No metadata: one
 *  price either way. `fiat_disabled`: ETH only. */
export function pricesFor(
  listedPrice: string,
  meta: Record<string, string> | undefined,
  voucher: Pick<VoucherInfo, 'priceMode' | 'value'>,
  currency: string
): PriceInfo {
  const listed = Number(listedPrice) || 0
  const ethAmount = Number(applyVoucherDiscount(listedPrice, voucher as VoucherInfo)) || 0
  const eth = money(ethAmount, currency)
  if (/^(true|yes|1)$/i.test((meta?.fiat_disabled ?? '').trim())) return { eth, fiat: null, mode: 'eth' }
  const fiatList = parseFiat(meta?.fiat_price_usd)
  if (fiatList === null) return { eth, fiat: eth, mode: 'same' }
  const value = Number(voucher.value) || 0
  let fiatAmount: number
  switch (voucher.priceMode) {
    case 'set':
      fiatAmount = value
      break
    case 'subtract':
      fiatAmount = fiatList - value
      break
    default:
      fiatAmount = listed > 0 ? fiatList * (ethAmount / listed) : fiatList
  }
  return { eth, fiat: money(cents(Math.max(0, fiatAmount)), currency), mode: 'both' }
}

export function priceSummary(p: PriceInfo): string {
  if (p.mode === 'eth') return `${p.eth} ETH only`
  return p.fiat && p.fiat !== p.eth ? `${p.eth} ETH · ${p.fiat} card` : p.eth
}

export function redeemUrlFor(code: string): string {
  const { baseUrl, organizer, event, customDomain } = TICKETING.pretix
  const root = baseUrl.replace(/\/$/, '')
  const path = customDomain ? '' : `/${organizer}/${event}`
  return `${root}${path}/redeem?voucher=${encodeURIComponent(code)}`
}

export async function describeVoucher(
  code: string
): Promise<{ ok: true; voucher: VoucherDescription } | { ok: false; error: string }> {
  const info = await validateVoucher(code)
  if (!info.valid) return { ok: false, error: info.error ?? 'Voucher is not valid' }
  let title = 'Any ticket'
  let prices: PriceInfo | null = null
  if (info.itemId) {
    const [item, event] = await Promise.all([getItem(info.itemId), getEvent()])
    title = getLocalizedString(item.name)
    let base = item.default_price
    // Variation metadata wins over the item's, as in the plugin.
    let meta: Record<string, string> = item.meta_data ?? {}
    if (info.variationId) {
      const v = item.variations.find(x => x.id === info.variationId)
      if (v) {
        title += ` (${getLocalizedString(v.value)})`
        base = v.default_price ?? v.price ?? base
        const vmeta = (v as { meta_data?: Record<string, string> }).meta_data
        if (vmeta?.fiat_price_usd?.trim()) meta = { ...meta, fiat_price_usd: vmeta.fiat_price_usd }
      }
    }
    prices = pricesFor(base, meta, info, event.currency)
  }
  return {
    ok: true,
    voucher: {
      code: info.code,
      title,
      description: info.comment || null,
      price: prices ? priceSummary(prices) : null,
      priceEth: prices?.eth ?? null,
      priceFiat: prices?.fiat ?? null,
      targetUrl: redeemUrlFor(info.code),
      redeemed: usedUp(info.redeemed, info.maxUsages),
      maxUsages: info.maxUsages,
      redemptions: info.redeemed,
    },
  }
}

/** Current redemption count and whether the voucher is used up. Null when
 *  Pretix cannot be reached, so callers keep the last known values. */
export async function getVoucherUsage(code: string): Promise<VoucherUsage | null> {
  const info = await validateVoucher(code)
  if (info.error?.startsWith('Failed to validate')) return null
  const fully = info.error === 'Voucher has been fully redeemed'
  return { redemptions: info.redeemed, maxUsages: info.maxUsages, usedUp: fully || usedUp(info.redeemed, info.maxUsages) }
}
