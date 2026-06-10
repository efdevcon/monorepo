import crypto from 'crypto'

type ProofKind = 'github' | 'wallet'

interface ProofPayload {
  k: ProofKind
  sub: string
  iat: number
  exp: number
}

const DEFAULT_TTL_SECONDS = 60 * 60 // 1 hour

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('NEXTAUTH_SECRET is not set')
  return s
}

function sign(data: string): string {
  return b64url(crypto.createHmac('sha256', secret()).update(data).digest())
}

/** Create a compact HMAC-signed proof token. `ttlSeconds` < 0 produces an already-expired token (for tests). */
export function signProof(kind: ProofKind, subject: string, ttlSeconds: number = DEFAULT_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000)
  const payload: ProofPayload = { k: kind, sub: subject, iat: now, exp: now + ttlSeconds }
  const body = b64url(Buffer.from(JSON.stringify(payload)))
  return `${body}.${sign(body)}`
}

/** Verify a proof token of the expected kind. Returns the subject on success, else null. */
export function verifyProof(token: string, expectedKind: ProofKind): string | null {
  if (!token || typeof token !== 'string') return null
  const dot = token.indexOf('.')
  if (dot < 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(body)
  // constant-time compare
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  let payload: ProofPayload
  try {
    payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'))
  } catch {
    return null
  }
  if (payload.k !== expectedKind) return null
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
  if (typeof payload.sub !== 'string' || !payload.sub) return null
  return payload.sub
}
