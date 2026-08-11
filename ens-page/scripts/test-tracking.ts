// Asserts the Matomo campaign-param mapping. Run: pnpm test:tracking
import { strict as assert } from 'node:assert'
import { trackedUrl } from '../src/lib/tracking'

assert.equal(
  trackedUrl('https://devcon.org/en/', 'Devcon 2026 in Mumbai'),
  'https://devcon.org/en/?mtm_campaign=ens-page&mtm_kwd=Devcon+2026+in+Mumbai'
)
assert.equal(
  trackedUrl('https://app.devcon.org/', 'Watch talks'),
  'https://app.devcon.org/?mtm_campaign=ens-page&mtm_kwd=Watch+talks',
  'subdomains get params'
)
assert.ok(
  trackedUrl('https://forum.devcon.org/c/dip-discussion/6?foo=1', 'Ideas').includes('foo=1'),
  'existing query params survive'
)
assert.ok(
  trackedUrl('https://blog.ethereum.org/2025/12/04/devconnect-arg-wrap', 'Recap').includes('mtm_campaign=ens-page'),
  'ethereum.org subdomains get params'
)
assert.equal(
  trackedUrl('https://jobs.ashbyhq.com/ethereum-foundation', "We're hiring!"),
  'https://jobs.ashbyhq.com/ethereum-foundation',
  'external destinations untouched'
)
assert.equal(
  trackedUrl('https://evildevcon.org/x', 'spoof'),
  'https://evildevcon.org/x',
  'hostname match is exact, not substring'
)
assert.equal(trackedUrl('not a url', 'x'), 'not a url', 'invalid URLs pass through')

console.log('test-tracking: all assertions passed')
