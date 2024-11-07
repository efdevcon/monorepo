import makeBlockie from 'ethereum-blockies-base64'
import { normalize } from 'viem/ens'
import { publicClient } from './web3'
import { Config, animals, adjectives, colors, uniqueNamesGenerator } from 'unique-names-generator'

export async function GetEnsName(address: `0x${string}`) {
  try {
    return await publicClient.getEnsName({ address })
  } catch (error) {
    return null
  }
}

export async function GetEnsAddress(name: string) {
  try {
    return await publicClient.getEnsAddress({
      name: normalize(name),
    })
  } catch (error) {
    return null
  }
}

export async function GetEnsAvatar(name: string) {
  let avatar
  try {
    if (name.endsWith('.eth')) {
      avatar = await publicClient.getEnsAvatar({
        name: normalize(name),
      })
    }
  } catch (error) {
    return CreateBlockie(name)
  }

  return avatar || CreateBlockie(name)
}

export function CreateBlockie(username: string) {
  return makeBlockie(username)
}

export function GenerateRandomUsername(seed?: string) {
  let config: Config = {
    dictionaries: [adjectives, colors, animals],
    separator: '-',
    style: 'capital',
  }

  if (seed) config.seed = seed

  return uniqueNamesGenerator(config)
}
