// Integration test: resolves the real d.krux.eth profile over public RPCs.
// Network-dependent by design (this is the code path the live site runs).
// Run: pnpm test:ens
import { strict as assert } from 'node:assert'
import { fetchEnsProfile } from '../src/lib/ens'

const profile = await fetchEnsProfile('d.krux.eth')
console.log(JSON.stringify(profile, null, 2))

assert.equal(profile.name, 'd.krux.eth')
assert.ok(profile.displayName.length > 0, 'displayName falls back to the ENS name')
assert.ok(profile.avatar, 'd.krux.eth has an avatar record')
assert.ok(profile.header && /^https?:\/\//.test(profile.header), 'd.krux.eth has an http header record')
assert.ok(Array.isArray(profile.socials))
for (const s of profile.socials) assert.ok(s.key && s.value)

console.log('test-ens: all assertions passed')
