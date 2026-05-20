import NextAuth, { AuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from 'next-auth/providers/credentials'
import { SiweMessage } from "siwe"

/**
 * M13: read NextAuth's CSRF token from the inbound request's cookie. The
 * cookie name varies by deployment scheme — HTTPS production uses the
 * `__Host-` prefix; HTTP dev uses the bare name. NextAuth stores the value
 * as `<token>|<hash>` URL-encoded; we only need the token part (the hash
 * is for NextAuth's own CSRF validation, separate from our SIWE-nonce use).
 *
 * Returns `null` when the cookie is missing/malformed so callers can reject
 * the sign-in attempt — failing closed is the whole point of this fix.
 */
function readNextAuthCsrfToken(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null
  const variants = [
    '__Host-next-auth.csrf-token',
    '__Secure-next-auth.csrf-token',
    'next-auth.csrf-token',
  ]
  for (const name of variants) {
    const pattern = new RegExp(`(?:^|;\\s*)${name.replace(/\./g, '\\.')}=([^;]+)`)
    const m = cookieHeader.match(pattern)
    if (m) {
      const value = decodeURIComponent(m[1])
      const token = value.split('|')[0]
      return token || null
    }
  }
  return null
}

declare module 'next-auth' {
    interface Session {
        id: string
        type: 'github' | 'ethereum'
        userId?: number
    }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET
if (!nextAuthSecret) {
  throw new Error('NEXTAUTH_SECRET is not set')
}

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID
if (!projectId) {
  throw new Error('NEXT_PUBLIC_WC_PROJECT_ID is not set')
}

const githubClientId = process.env.NEXTAUTH_GITHUB_CLIENT_ID ?? ''
const githubClientSecret = process.env.NEXTAUTH_GITHUB_CLIENT_SECRET ?? ''

if (!githubClientId || !githubClientSecret) {
  throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set')
}

export const authOptions: AuthOptions = {
    secret: process.env.NEXTAUTH_SECRET,
    session: {
      strategy: 'jwt'
    },
    providers: [
        GithubProvider({
            clientId: githubClientId,
            clientSecret: githubClientSecret
        }),
        CredentialsProvider({
            name: 'Ethereum',
            credentials: {
              message: {
                label: 'Message',
                type: 'text',
                placeholder: '0x0'
              },
              signature: {
                label: 'Signature',
                type: 'text',
                placeholder: '0x0'
              }
            },
            async authorize(credentials, req) {
                try {
                    if (!credentials?.message || !credentials?.signature) {
                        console.error('Missing Siwe credentials', credentials)
                        return null
                    }

                    const siwe = new SiweMessage(JSON.parse(credentials.message))
                    const nextAuthUrl = new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000')

                    // M13: read the server-issued nonce (NextAuth CSRF token from the
                    // cookie) and pass it to `siwe.verify` as the authoritative nonce.
                    // Pre-fix code passed `siwe.nonce` — the value embedded in the
                    // client-supplied message — which made the check `siwe.nonce ===
                    // siwe.nonce` (always true). The FE builds the SIWE message with
                    // `nonce: await getCsrfToken()` so the message-side and server-side
                    // values match for a legitimate sign-in. Captured signature replay
                    // fails: the attacker doesn't have the original cookie's CSRF
                    // value (HttpOnly + same-origin), so even if they replay the
                    // signature, the server-side nonce won't match what's in the
                    // signed message.
                    const cookieHeader =
                        (req?.headers?.cookie as string | undefined) ?? undefined
                    const expectedNonce = readNextAuthCsrfToken(cookieHeader)
                    if (!expectedNonce) {
                        console.error('SIWE: missing or malformed NextAuth CSRF cookie')
                        return null
                    }
                    if (siwe.nonce !== expectedNonce) {
                        console.error(
                            'SIWE: nonce mismatch — message nonce does not match server-issued CSRF token',
                        )
                        return null
                    }

                    const result = await siwe.verify({
                        signature: credentials?.signature || "",
                        domain: nextAuthUrl.host,
                        nonce: expectedNonce,
                    })

                    if (result.success) {
                        return {
                            id: siwe.address,
                            type: 'ethereum'
                        }
                    }

                    return null
                } catch (e) {
                    console.error('Unable to authorize Siwe', e)
                    return null
                }
            }
        })
    ],
    callbacks: {
        async session({ session, token }) {
            if (!token.sub) {
              return session
            }

            session.id = token.sub
            session.type = token.sub.startsWith('0x') ? 'ethereum' : 'github'

            if (session.type === 'github') {
                const response = await fetch('https://api.github.com/user/' + token.sub, {
                    headers: {
                        Authorization: `token ${process.env.GITHUB_TOKEN}`
                    }
                })

                if (response.status === 200) {
                    const user = await response.json()
                    if (user) { 
                        session.id = user.login
                        session.userId = user.id
                    }
                } else {
                    console.error('Unable to fetch Github user', response.status, response.statusText)
                    console.log(response)
                }
            }

            return session
        }
    }
}

export default NextAuth(authOptions)