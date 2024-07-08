import NextAuth, { AuthOptions } from "next-auth"
import GithubProvider from "next-auth/providers/github"
import CredentialsProvider from 'next-auth/providers/credentials'
import { SiweMessage } from "siwe"

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
            async authorize(credentials) {
                try {
                    if (!credentials?.message || !credentials?.signature) {
                        console.error('Missing Siwe credentials', credentials)
                        return null
                    }

                    const siwe = new SiweMessage(JSON.parse(credentials.message))
                    const nextAuthUrl = new URL(process.env.NEXTAUTH_URL ?? 'http://localhost:3000')
                    const result = await siwe.verify({
                        signature: credentials?.signature || "",
                        domain: nextAuthUrl.host,
                        nonce: siwe.nonce,
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