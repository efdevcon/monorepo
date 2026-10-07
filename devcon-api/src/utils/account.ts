import makeBlockie from './blockies-svg'
import { Config, animals, adjectives, colors, uniqueNamesGenerator } from 'unique-names-generator'

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
