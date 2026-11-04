// Unit test for the pure part of services/qr-share-voucher.ts (dev config: slug-based Pretix paths).
// Run: pnpm exec tsx src/scripts/qr-share/test-qr-share-voucher.ts
import 'dotenv/config'
import assert from 'node:assert/strict'
import { redeemUrlFor, usedUp, pricesFor } from '../../services/qr-share-voucher'

assert.equal(process.env.NEXT_PUBLIC_PRETIX_ENV ?? 'development', 'development', 'run without NEXT_PUBLIC_PRETIX_ENV')
assert.equal(redeemUrlFor('ABC123'), 'https://dcdev2.ticketh.xyz/org/8/redeem?voucher=ABC123')
assert.equal(redeemUrlFor('a b'), 'https://dcdev2.ticketh.xyz/org/8/redeem?voucher=a%20b')
// usedUp: a voucher counts as redeemed only once its redemptions reach the
// maximum; a multi-use voucher with uses left is still shareable, and an
// unlimited one (max 0) never is used up
assert.equal(usedUp(1, 1), true)
assert.equal(usedUp(0, 1), false)
assert.equal(usedUp(98, 200), false)
assert.equal(usedUp(200, 200), true)
assert.equal(usedUp(5, 0), false)

// pricesFor mirrors the Pretix ETH plugin: the item price is the ETH price and
// `fiat_price_usd` metadata the card price. A 'set' voucher makes both prices
// that flat value, 'subtract' takes the same amount off both, 'percent' (and no
// discount) scales the card price by the same ratio. No metadata = same price
// both ways; `fiat_disabled` = ETH only.
const v = (priceMode: 'none' | 'set' | 'subtract' | 'percent', value: string) => ({ priceMode, value })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('set', '444.11'), 'USD'), { eth: '$444.11', fiat: '$444.11', inr: null, mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('none', '0'), 'USD'), { eth: '$499.00', fiat: '$999.00', inr: null, mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('percent', '11'), 'USD'), { eth: '$444.11', fiat: '$889.11', inr: null, mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('subtract', '99'), 'USD'), { eth: '$400.00', fiat: '$900.00', inr: null, mode: 'both' })
assert.deepEqual(pricesFor('349.00', {}, v('none', '0'), 'USD'), { eth: '$349.00', fiat: '$349.00', inr: null, mode: 'same' })
assert.deepEqual(pricesFor('349.00', { fiat_disabled: 'true' }, v('none', '0'), 'USD'), { eth: '$349.00', fiat: null, inr: null, mode: 'eth' })
assert.deepEqual(pricesFor('0.00', { fiat_price_usd: '999' }, v('set', '0'), 'USD'), { eth: '$0.00', fiat: '$0.00', inr: null, mode: 'both' })
assert.deepEqual(pricesFor('10.00', {}, v('none', '0'), 'EUR'), { eth: '10.00 EUR', fiat: '10.00 EUR', inr: null, mode: 'same' })

// Rupee price (UPI rail): the item's `upi_price_inr` pairs with the card list
// price and scales with what the buyer pays by card, so vouchers take the same
// share off the rupees; an ETH-only item has no UPI.
assert.deepEqual(pricesFor('25.00', { upi_price_inr: '2370' }, v('none', '0'), 'USD'), { eth: '$25.00', fiat: '$25.00', inr: '₹2,370', mode: 'same' })
assert.deepEqual(pricesFor('25.00', { upi_price_inr: '2370' }, v('percent', '10'), 'USD'), { eth: '$22.50', fiat: '$22.50', inr: '₹2,133', mode: 'same' })
assert.deepEqual(pricesFor('25.00', { upi_price_inr: '2370' }, v('set', '20'), 'USD'), { eth: '$20.00', fiat: '$20.00', inr: '₹1,896', mode: 'same' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999', upi_price_inr: '90000' }, v('none', '0'), 'USD'), { eth: '$499.00', fiat: '$999.00', inr: '₹90,000', mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999', upi_price_inr: '90000' }, v('set', '444.11'), 'USD'), { eth: '$444.11', fiat: '$444.11', inr: '₹40,009.91', mode: 'both' })
assert.deepEqual(pricesFor('35.00', { upi_price_inr: '3315' }, v('percent', '50'), 'USD'), { eth: '$17.50', fiat: '$17.50', inr: '₹1,657.50', mode: 'same' })
assert.deepEqual(pricesFor('349.00', { fiat_disabled: 'true', upi_price_inr: '30000' }, v('none', '0'), 'USD'), { eth: '$349.00', fiat: null, inr: null, mode: 'eth' })
assert.deepEqual(pricesFor('25.00', { upi_price_inr: 'abc' }, v('none', '0'), 'USD'), { eth: '$25.00', fiat: '$25.00', inr: null, mode: 'same' })

console.log('ok redeemUrlFor + usedUp + pricesFor (incl. rupees)')
