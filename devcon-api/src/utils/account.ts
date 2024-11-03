import makeBlockie from 'ethereum-blockies-base64'
import { normalize } from 'viem/ens'
import { publicClient } from './web3'

export async function GetEnsName(address: `0x${string}`) {
  return await publicClient.getEnsName({ address })
}

export async function GetEnsAddress(name: string) {
  return await publicClient.getEnsAddress({
    name: normalize(name),
  })
}

export async function GetEnsAvatar(name: string) {
  let avatar
  if (name.endsWith('.eth')) {
    avatar = await publicClient.getEnsAvatar({
      name: normalize(name),
    })
  }

  return avatar || CreateBlockie(name)
}

export function CreateBlockie(username: string) {
  return makeBlockie(username)
}
