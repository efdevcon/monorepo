// Unit tests for the pure helpers of services/qr-shares.ts.
// Run: pnpm exec tsx src/scripts/qr-share/test-qr-shares.ts
import assert from 'node:assert/strict'
import {
  newToken,
  parseVoucherInput,
  parseLinks,
  canOpenShare,
  titleForLinks,
  bindingKeyFor,
  bindsBrowser,
  dueForRefresh,
  type Share,
} from '../../services/qr-shares'

const base: Share = {
  id: 1,
  token: 'abcdefghijkl',
  kind: 'voucher',
  voucherCode: 'X',
  targetUrl: 'https://t/redeem?voucher=X',
  links: [],
  title: 't',
  description: null,
  price: null,
  priceEth: null,
  priceFiat: null,
  env: 'development',
  active: true,
  status: 'open',
  sharedAt: null,
  scannedAt: null,
  scanCount: 0,
  browserKey: null,
  redeemed: false,
  maxUsages: 1,
  redemptions: 0,
  lastPretixCheck: null,
}

// newToken: 12 lower-case base32 chars, different each call
const t1 = newToken()
const t2 = newToken()
assert.match(t1, /^[a-z2-7]{12}$/)
assert.notEqual(t1, t2)

// parseVoucherInput: URL forms and bare codes
assert.equal(parseVoucherInput('https://tickets.devcon.org/redeem?voucher=ABC123'), 'ABC123')
assert.equal(parseVoucherInput('  https://tickets.devcon.org/redeem/?VOUCHER=abc-123&x=1 '), 'abc-123')
assert.equal(parseVoucherInput('https://dcdev2.ticketh.xyz/org/8/redeem?voucher=Z9'), 'Z9')
assert.equal(parseVoucherInput('ABC123'), 'ABC123')
assert.equal(parseVoucherInput(' abc 123 '), null) // spaces inside: not a code
assert.equal(parseVoucherInput('https://tickets.devcon.org/'), null)
assert.equal(parseVoucherInput(''), null)

// parseLinks: tolerant of hand-edited JSON
assert.deepEqual(parseLinks('[{"label":"T&C","url":"https://devcon.org/tc/"}]'), [{ label: 'T&C', url: 'https://devcon.org/tc/' }])
assert.deepEqual(parseLinks('not json'), [])
assert.deepEqual(parseLinks('[{"label":"no url"}]'), [])
assert.deepEqual(parseLinks(null), [])
assert.deepEqual(parseLinks([{ label: 'A', url: 'https://a' }]), [{ label: 'A', url: 'https://a' }])
// only http(s) ever reaches an href, whatever a hand edit in NocoDB put there
assert.deepEqual(parseLinks('[{"label":"x","url":"javascript:alert(1)"}]'), [])
assert.deepEqual(parseLinks('[{"label":"x","url":"data:text/html,hi"}]'), [])

// canOpenShare: first browser binds, same cookie reopens, others refused
assert.equal(canOpenShare(base, null), 'first')
assert.equal(canOpenShare({ ...base, browserKey: 'k1' }, 'k1'), 'same')
assert.equal(canOpenShare({ ...base, browserKey: 'k1' }, 'k2'), 'other')
assert.equal(canOpenShare({ ...base, browserKey: 'k1' }, null), 'other')
assert.equal(canOpenShare({ ...base, kind: 'links', browserKey: 'k1' }, null), 'same') // links never bind
// every voucher QR is one scan, multi-use ones included: the first browser binds, the
// next buyer gets a fresh code from "show again"
assert.equal(canOpenShare({ ...base, maxUsages: 200 }, null), 'first')
assert.equal(canOpenShare({ ...base, maxUsages: 0, browserKey: 'k1' }, 'k9'), 'other')
assert.equal(bindsBrowser(base), true)
assert.equal(bindsBrowser({ ...base, maxUsages: 5 }), true)
assert.equal(bindsBrowser({ ...base, kind: 'links' }), false)

// titleForLinks
assert.equal(titleForLinks([{ label: 'T&C', url: 'u' }, { label: 'Youth form', url: 'v' }]), 'T&C, Youth form')
assert.equal(titleForLinks([]), 'Links')

// bindingKeyFor: a browser that already carries a key keeps it (a buyer scanning
// a second code must not lose the first page); anything else gets a fresh key
const kept = bindingKeyFor('0123456789abcdef0123456789abcdef')
assert.deepEqual(kept, { key: '0123456789abcdef0123456789abcdef', isNew: false })
const fresh = bindingKeyFor(null)
assert.match(fresh.key, /^[a-f0-9]{32}$/)
assert.equal(fresh.isNew, true)
assert.equal(bindingKeyFor('not-a-key').isNew, true)
assert.notEqual(bindingKeyFor(null).key, fresh.key)

// dueForRefresh: only unredeemed, unclosed voucher rows past the 30 s window,
// least recently checked first, capped
const now = Date.parse('2026-10-14T12:00:00Z')
const row = (id: number, extra: Partial<Share>): Share => ({ ...base, id, ...extra })
const rows: Share[] = [
  row(1, { lastPretixCheck: '2026-10-14T11:59:50Z' }), // checked 10 s ago: not due
  row(2, { lastPretixCheck: '2026-10-14T11:00:00Z' }), // due, older check
  row(3, { lastPretixCheck: null }), // never checked: first
  row(4, { kind: 'links', lastPretixCheck: null }), // not a voucher
  row(5, { status: 'closed', lastPretixCheck: null }), // closed
  row(6, { redeemed: true, lastPretixCheck: null }), // already redeemed
  row(7, { lastPretixCheck: '2026-10-14T11:30:00Z' }), // due, newer check
]
assert.deepEqual(
  dueForRefresh(rows, now).map(s => s.id),
  [3, 2, 7]
)
assert.deepEqual(
  dueForRefresh(rows, now, 2).map(s => s.id),
  [3, 2]
)

console.log('ok qr-shares helpers')
