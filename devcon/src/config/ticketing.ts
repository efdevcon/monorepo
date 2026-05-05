export type TicketingEnv = 'development' | 'production'
export const TICKETING_ENV: TicketingEnv =
  (process.env.NEXT_PUBLIC_PRETIX_ENV as TicketingEnv) || 'development'

const ENV_CONFIG = {
  // development: {
  //   chainEnv: 'mainnet' as const,
  //   pretix: {
  //     baseUrl: 'https://dcdev2.ticketh.xyz',
  //     organizer: 'org',
  //     event: 'test',
  //     ticketDiscountId: '6',
  //     defaultQuotaId: 116,
  //     testmode: true,
  //   },
  //   checkout: {
  //     pretixRedirectUrl: '',
  //     forcePretixRedirect: false,
  //     // Buyer-facing support inbox surfaced as "Need help?" mailto in the
  //     // checkout UI. Empty hides the link.
  //     supportEmail: 'support@devcon.org',
  //   },
  //   payment: {
  //     recipientAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
  //     relayerAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
  //     cryptoDiscountPercent: 10,
  //     fiatEnabled: true,
  //     enabledTokens: ['ETH', 'USDC', 'USDT0'] as readonly ('ETH' | 'USDC' | 'USDT0')[],
  //   },
  //   tax: {
  //     vatPercent: 18,
  //     label: 'GST',
  //   },
  //   self: {
  //     scope: 'devcon-india-local-discount',
  //     staging: true,
  //     requireEarlyAccess: false,
  //   },
  //   discount: {
  //     collection: 'test-india-early-bird',
  //   },
  //   aadhaar: {
  //     nullifierSeed: 14687622115861671582408676159101191136114,
  //   },
  //   questions: {
  //     goalsIdentifier: 'devcon-goals',
  //   },
  //   overrides: {
  //     soldOut: false,
  //   },
  //   isShopOpen: true,
  //   x402Agents: false,
  // },
  development: {
    chainEnv: 'mainnet' as const,
    pretix: {
      baseUrl: 'https://mum.ticketh.xyz',
      organizer: 'devcon',
      event: '8',
      ticketDiscountId: '2',
      defaultQuotaId: 116, // TODO: confirm production quota ID
      // TODO: disable testmode for production
      testmode: true,
    },
    checkout: {
      pretixRedirectUrl: '',
      forcePretixRedirect: false,
      // Buyer-facing support inbox surfaced as "Need help?" mailto in the
      // checkout UI. Empty hides the link.
      supportEmail: 'support@devcon.org',
    },
    payment: {
      // TODO: replace with production recipient address
      recipientAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      // recipientAddress: '0x403A3A81abA974dEb4faF20514ae34FAf9268E28',
      relayerAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      cryptoDiscountPercent: 10,
      fiatEnabled: true,
      enabledTokens: ['ETH', 'USDC', 'USDT0'] as readonly ('ETH' | 'USDC' | 'USDT0')[],
    },
    tax: {
      vatPercent: 18,
      label: 'GST',
    },
    self: {
      scope: 'devcon-india-local-discount',
      // TODO: replace with production staging
      staging: true,
      // TODO: replace after event
      requireEarlyAccess: false,
    },
    discount: {
      // TODO: replace with india-early-bird
      collection: 'test-india-early-bird',
    },
    aadhaar: {
      nullifierSeed: 14687622115861671582408676159101191136114,
    },
    questions: {
      goalsIdentifier: 'FNXHWF39',
    },
    overrides: {
      soldOut: false,
    },
    isShopOpen: false,
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
      // TODO: disable testmode for production
      testmode: true,
    },
    checkout: {
      pretixRedirectUrl: '',
      forcePretixRedirect: false,
      // Buyer-facing support inbox surfaced as "Need help?" mailto in the
      // checkout UI. Empty hides the link.
      supportEmail: 'support@devcon.org',
    },
    payment: {
      // TODO: replace with production recipient address
      recipientAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      // recipientAddress: '0x403A3A81abA974dEb4faF20514ae34FAf9268E28',
      relayerAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      cryptoDiscountPercent: 3,
      fiatEnabled: true,
      enabledTokens: ['ETH', 'USDC', 'USDT0'] as readonly ('ETH' | 'USDC' | 'USDT0')[],
    },
    tax: {
      vatPercent: 18,
      label: 'GST',
    },
    self: {
      scope: 'devcon-india-local-discount',
      // TODO: replace with production staging
      staging: false,
      // TODO: replace after event
      requireEarlyAccess: false,
    },
    discount: {
      // TODO: replace with india-early-bird
      collection: 'india-early-bird',
    },
    aadhaar: {
      nullifierSeed: 14687622115861671582408676159101191136114,
    },
    questions: {
      goalsIdentifier: 'FNXHWF39',
    },
    overrides: {
      soldOut: true,
    },
    isShopOpen: false,
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
