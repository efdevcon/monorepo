// Asserts the ENS record -> profile URL mapping. Run: pnpm test:socials
import { strict as assert } from 'node:assert'
import { SOCIAL_KEYS, socialUrl, socialLabel } from '../src/lib/socials'

assert.equal(socialUrl('com.twitter', 'efdevcon'), 'https://x.com/efdevcon')
assert.equal(socialUrl('com.twitter', '@efdevcon'), 'https://x.com/efdevcon', 'strips @ prefix')
assert.equal(socialUrl('com.instagram', 'efdevcon'), 'https://instagram.com/efdevcon')
assert.equal(socialUrl('com.github', 'efdevcon'), 'https://github.com/efdevcon')
assert.equal(socialUrl('org.telegram', 'devcon'), 'https://t.me/devcon')
assert.equal(socialUrl('xyz.farcaster', 'devcon'), 'https://warpcast.com/devcon')
assert.equal(socialUrl('email', 'support@devcon.org'), 'mailto:support@devcon.org')
assert.equal(socialUrl('com.youtube', 'EthereumDevcon'), 'https://youtube.com/@EthereumDevcon')
assert.equal(
  socialUrl('com.youtube', 'https://www.youtube.com/c/EthereumFoundation/search?query=devcon'),
  'https://www.youtube.com/c/EthereumFoundation/search?query=devcon',
  'full URLs pass through untouched'
)
assert.equal(socialUrl('com.twitter', '  '), null, 'blank values yield null')
assert.equal(socialUrl('com.mystery', 'x'), null, 'unknown keys yield null')
assert.equal(socialLabel('com.twitter'), 'X')
assert.equal(socialLabel('com.mystery'), null)
assert.ok(SOCIAL_KEYS.includes('com.twitter') && SOCIAL_KEYS.includes('email'))

console.log('test-socials: all assertions passed')
