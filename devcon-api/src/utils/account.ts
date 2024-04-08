import { getDefaultProvider } from '@ethersproject/providers'
import makeBlockie from 'ethereum-blockies-base64'

export async function GetAvatar(username: string) {
  if (username.endsWith('.eth')) {
    try {
      const provider = getDefaultProvider()
      const resolver = await provider.getResolver(username)
      const ensAvatar = await resolver?.getAvatar()
      if (ensAvatar?.url) {
        return ensAvatar?.url
      }
    } catch (e) {
      console.warn('Unable to resolve ENS avatar')
    }
  }

  return CreateBlockie(username)
}

export function CreateBlockie(username: string) {
  return makeBlockie(username)
}
