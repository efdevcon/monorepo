import { UserAccount } from 'types/UserAccount';
import { uniqueNamesGenerator, Config, adjectives, colors, animals } from 'unique-names-generator';

export function getRandomUsername(seed?: string) {
    let config: Config = {
        dictionaries: [adjectives, colors, animals],
        separator: ' ',
        style: 'capital'
    }

    if (seed) config.seed = seed

    return uniqueNamesGenerator(config)
}

export function getUsername(account: UserAccount) {
    if (account.activeAddress) {
        return account.activeAddress
    }

    if (account.addresses.length > 0) {
        return account.addresses[0]
    }

    if (account.email) {
        return account.email
    }

    return ''
}