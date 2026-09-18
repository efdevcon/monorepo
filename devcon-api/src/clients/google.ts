import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import path from 'path'
import { authenticate } from '@google-cloud/local-auth'

export async function GetAccessToken(scopes: string[]) {
  console.log(
    `  Google: authenticating as ${
      process.env.GOOGLE_IMPERSONATE_USER || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '(no credentials)'
    }`
  )

  const credentials = {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_CLOUD_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
  }

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: scopes,
    // Domain-wide delegation: act as this Workspace user instead of the bare
    // service account, so Drive items are created and read as an internal
    // identity. Needs the account's client id authorised for these scopes in
    // the Workspace admin console; unset = plain service account as before.
    subject: process.env.GOOGLE_IMPERSONATE_USER || undefined,
  })

  return auth.getAccessToken()
}

export async function AuthenticateServiceAccount(scopes: string[]) {
  console.log(
    `  Google: authenticating as ${
      process.env.GOOGLE_IMPERSONATE_USER || process.env.GOOGLE_CLOUD_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL || '(no credentials)'
    }`
  )

  const credentials = {
    client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL,
    private_key: (process.env.GOOGLE_CLOUD_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY)?.replace(/\\n/g, '\n'),
  }

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: scopes,
    // Domain-wide delegation: act as this Workspace user instead of the bare
    // service account, so Drive items are created and read as an internal
    // identity. Needs the account's client id authorised for these scopes in
    // the Workspace admin console; unset = plain service account as before.
    subject: process.env.GOOGLE_IMPERSONATE_USER || undefined,
  })

  google.options({ auth: auth as any })

  return google
}

export async function GetAuthenticatedYoutubeClient() {
  console.log('Authenticating with Youtube', path.join(__dirname, 'client_secret.json'))
  const auth = await authenticate({
    keyfilePath: path.join(__dirname, '../../credentials.json'),
    scopes: [
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.upload',
    ],
  })

  google.options({ auth })
  return google.youtube('v3')
}
