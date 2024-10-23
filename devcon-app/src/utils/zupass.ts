import { Zapp } from '@parcnet-js/app-connector'
import { DEFAULT_APP_PAGE } from './constants'

export const ZUPASS_URL = process.env.NEXT_PUBLIC_ZUPASS_URL ?? 'https://zupass.org'

export const ZAPP: Zapp = {
  name: `${DEFAULT_APP_PAGE.title} Zapp`,
  permissions: {
    READ_PUBLIC_IDENTIFIERS: {},
    REQUEST_PROOF: { collections: ['Devcon SEA'] },
    READ_POD: { collections: ['Devcon SEA'] },
  },
}
