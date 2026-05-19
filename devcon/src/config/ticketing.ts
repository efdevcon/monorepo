export type TicketingEnv = 'development' | 'production'
export const TICKETING_ENV: TicketingEnv = (process.env.NEXT_PUBLIC_PRETIX_ENV as TicketingEnv) || 'development'

const ENV_CONFIG = {
  development: {
    chainEnv: 'mainnet' as const,
    pretix: {
      baseUrl: 'https://dcdev2.ticketh.xyz',
      organizer: 'org',
      event: '8',
      // True when `baseUrl` is a Pretix-managed custom event domain (Pretix's
      // multidomain feature serves the event at root — `/order/...`, not
      // `/{organizer}/{event}/order/...`). Drives URL construction in
      // status.ts and the checkout fallback redirect. Legacy slug-based
      // Pretix instances (e.g. dcdev2.ticketh.xyz) leave this `false`.
      customDomain: false,
      ticketDiscountId: '6',
      defaultQuotaId: 116,
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
      recipientAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      relayerAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      // Crypto-payment discount percentage. 0 disables the discount entirely
      // (no UI, no API field, no math). Set per environment. Default 0 so a
      // new environment doesn't accidentally ship with a discount nobody
      // signed off on.
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
      staging: true,
      requireEarlyAccess: false,
    },
    discount: {
      collection: 'test-india-early-bird',
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
    isShopOpen: true,
    x402Agents: false,
  },
  production: {
    chainEnv: 'mainnet' as const,
    pretix: {
      baseUrl: 'https://tickets.devcon.org',
      organizer: 'devcon',
      event: '8',
      // tickets.devcon.org is a Pretix-managed custom event domain — the
      // event is mounted at root, so user-facing URLs are /order/CODE/...
      // (not /devcon/8/order/CODE/...). See development.pretix.customDomain
      // for details.
      customDomain: true,
      ticketDiscountId: '2',
      defaultQuotaId: 116,
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
      recipientAddress: '0x403A3A81abA974dEb4faF20514ae34FAf9268E28',
      relayerAddress: '0xA163a78C0b811A984fFe1B98b4b1b95BAb24aAcD',
      // Crypto-payment discount percentage. 0 disables the discount entirely
      // (no UI, no API field, no math). Set per environment. Default 0 so a
      // new environment doesn't accidentally ship with a discount nobody
      // signed off on.
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
      staging: false,
      requireEarlyAccess: false,
    },
    discount: {
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

/** Build a user-facing Pretix URL that respects the event's custom-domain
 *  setting. On a custom event domain (`tickets.devcon.org`) the event lives at
 *  root: `/order/CODE/...`. On a legacy slug-based instance, the path needs the
 *  `/{organizer}/{event}/` prefix. Pass the path INCLUDING leading slash, e.g.
 *  `'/order/ABCDE/secret/'`. Returns an absolute URL. */
export function pretixEventUrl(path: string): string {
  const base = TICKETING.pretix.baseUrl.replace(/\/$/, '')
  const eventPrefix = TICKETING.pretix.customDomain
    ? ''
    : `/${TICKETING.pretix.organizer}/${TICKETING.pretix.event}`
  return `${base}${eventPrefix}${path}`
}

/** Whether the chain environment is testnet (derived from config) */
export const isTestnet = TICKETING.chainEnv !== 'mainnet'

/** Server-side only: get the Pretix API token for the active environment */
export function getPretixApiToken(): string {
  const token = TICKETING_ENV === 'production' ? process.env.PRETIX_API_TOKEN_PROD : process.env.PRETIX_API_TOKEN_DEV
  if (!token) throw new Error(`PRETIX_API_TOKEN_${TICKETING_ENV === 'production' ? 'PROD' : 'DEV'} is not set`)
  return token
}
