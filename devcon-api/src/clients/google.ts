import { google } from 'googleapis'
import { JWT } from 'google-auth-library'
import path from 'path'
import { authenticate } from '@google-cloud/local-auth'

export async function GetAccessToken(scopes: string[]) {
  console.log('Authenticating with Google', scopes)

  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: scopes,
  })

  return auth.getAccessToken()
}

export async function AuthenticateServiceAccount(scopes: string[]) {
  console.log('Authenticating with Google', scopes)

  const credentials = {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  const auth = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: scopes,
  })

  google.options({ auth })

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
