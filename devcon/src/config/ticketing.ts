export type TicketingEnv = 'development' | 'production'
export const TICKETING_ENV: TicketingEnv =
  (process.env.NEXT_PUBLIC_PRETIX_ENV as TicketingEnv) || 'development'

const ENV_CONFIG = {
  development: {
    chainEnv: 'mainnet' as const,
    pretix: {
      baseUrl: 'https://dcdev2.ticketh.xyz',
      organizer: 'org',
      event: 'test',
      ticketDiscountId: '6',
      defaultQuotaId: 116,
    },
    checkout: {
      pretixRedirectUrl: '',
      useDaimoPay: false,
    },
    payment: {
      recipientAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      cryptoDiscountPercent: 3,
    },
    self: {
      scope: 'devcon-india-local-discount',
      staging: true,
      requireEarlyAccess: true,
    },
    discount: {
      collection: 'dev-local-early-bird',
    },
    aadhaar: {
      nullifierSeed: 14687622115861671582408676159101191136114,
    },
    questions: {
      goalsIdentifier: 'devcon-goals',
    },
    overrides: {
      soldOut: false,
    },
    x402Agents: false,
  },
  production: {
    chainEnv: 'mainnet' as const,
    pretix: {
      baseUrl: 'https://mum.ticketh.xyz',
      organizer: 'devcon',
      event: '8',
      ticketDiscountId: '2',
      defaultQuotaId: 116, // TODO: confirm production quota ID
    },
    checkout: {
      pretixRedirectUrl: '',
      useDaimoPay: false,
    },
    payment: {
      recipientAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      // TODO: replace with production recipient address
      // recipientAddress: '0xFc488aE9cB395B150574Aa5ce8a321c9100b1ee3',
      cryptoDiscountPercent: 3,
    },
    self: {
      scope: 'devcon-india-local-discount',
      // TODO: replace with production staging
      staging: true,
      requireEarlyAccess: true,
    },
    discount: {
      // TODO: replace with production collection
      collection: 'dev-local-early-bird',
      // collection: 'local-early-bird',
    },
    aadhaar: {
      nullifierSeed: 14687622115861671582408676159101191136114,
    },
    questions: {
      goalsIdentifier: 'devcon-goals',
    },
    overrides: {
      soldOut: false,
    },
    x402Agents: false,
  },
}

export const TICKETING = ENV_CONFIG[TICKETING_ENV]

/** Whether the chain environment is testnet (derived from config) */
export const isTestnet = TICKETING.chainEnv !== 'mainnet'

/** Server-side only: get the Pretix API token for the active environment */
export function getPretixApiToken(): string {
  const token =
    TICKETING_ENV === 'production' ? process.env.PRETIX_API_TOKEN_PROD : process.env.PRETIX_API_TOKEN_DEV
  if (!token) throw new Error(`PRETIX_API_TOKEN_${TICKETING_ENV === 'production' ? 'PROD' : 'DEV'} is not set`)
  return token
}
