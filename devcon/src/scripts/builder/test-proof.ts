import { signProof, verifyProof } from '../../services/builder/proof'
import { assertEqual } from './_assert'

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-do-not-use'

const token = signProof('github', 'didierkrux')
const ok = verifyProof(token, 'github')
assertEqual(ok, 'didierkrux', 'valid github proof round-trips')

assertEqual(verifyProof(token, 'wallet'), null, 'wrong kind rejected')
assertEqual(verifyProof(token + 'x', 'github'), null, 'tampered signature rejected')
assertEqual(verifyProof('garbage', 'github'), null, 'garbage rejected')

const expired = signProof('wallet', '0xabc', -10) // already expired
assertEqual(verifyProof(expired, 'wallet'), null, 'expired rejected')

console.log('ALL PASS')
