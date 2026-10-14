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
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('set', '444.11'), 'USD'), { eth: '$444.11', fiat: '$444.11', mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('none', '0'), 'USD'), { eth: '$499.00', fiat: '$999.00', mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('percent', '11'), 'USD'), { eth: '$444.11', fiat: '$889.11', mode: 'both' })
assert.deepEqual(pricesFor('499.00', { fiat_price_usd: '999' }, v('subtract', '99'), 'USD'), { eth: '$400.00', fiat: '$900.00', mode: 'both' })
assert.deepEqual(pricesFor('349.00', {}, v('none', '0'), 'USD'), { eth: '$349.00', fiat: '$349.00', mode: 'same' })
assert.deepEqual(pricesFor('349.00', { fiat_disabled: 'true' }, v('none', '0'), 'USD'), { eth: '$349.00', fiat: null, mode: 'eth' })
assert.deepEqual(pricesFor('0.00', { fiat_price_usd: '999' }, v('set', '0'), 'USD'), { eth: '$0.00', fiat: '$0.00', mode: 'both' })
assert.deepEqual(pricesFor('10.00', {}, v('none', '0'), 'EUR'), { eth: '10.00 EUR', fiat: '10.00 EUR', mode: 'same' })

console.log('ok redeemUrlFor + usedUp + pricesFor')
