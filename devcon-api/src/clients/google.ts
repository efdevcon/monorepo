import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

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
