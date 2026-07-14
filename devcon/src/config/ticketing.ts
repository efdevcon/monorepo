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
      x402ApiEnabled: true,
      ticketDiscountId: '6',
      // Pretix item ID treated as the headline "General Admission" ticket on
      // the store page (the one wired to the GA card's quantity + Checkout).
      // Pins WHICH admission item is used instead of relying on Pretix's item
      // ordering. Falls back to the first available admission item when null
      // or when the configured item isn't currently purchasable.
      gaItemId: 145 as number | null,
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
      cryptoDiscountPercent: 0,
      fiatEnabled: true,
      enabledTokens: ['ETH'] as readonly ('ETH' | 'USDC' | 'USDT0')[],
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
      collection: 'test-india-resident',
      // Prefix for community-discount voucher collections (Core Devs, OSS,
      // Public Goods, Past POAP). Dev and prod share one Supabase instance, so
      // the prefix keeps dev claims from draining prod pools. See
      // `discountCollection()`.
      communityPrefix: 'test-',
      // Pretix item IDs for each voucher-gated discount ticket. A claim issues
      // a single-use voucher (price_mode 'none') that unlocks the matching
      // (normally voucher-only) ticket; the price and quota live on the item.
      // Keyed by the discount `type` from /api/discounts/validate, plus the
      // Self-flow type (india-resident) used by redeem-self.ts.
      items: {
        'general-admission': 145,
        'core-devs': 152,
        'oss-contributors': 153,
        'pg-projects': 154,
        'past-attendees': 155,
        builder: 143,
        'india-resident': 139,
        'indian-student': 141,
        'international-student': 142,
        youth: 144,
      } as Record<string, number>,
      // Manual sold-out override per discount `type`. true = force sold out
      // (block issuing new vouchers); false = force available (skip the live
      // Pretix quota check); absent = use live Pretix item availability.
      // Uncomment a line to force that ticket sold out.
      soldOut: {
        // 'general-admission': true,
        // 'core-devs': true,
        // 'oss-contributors': true,
        // 'pg-projects': true,
        // 'past-attendees': true,
        // builder: true,
        // 'india-resident': true,
        // 'indian-student': true,
        // 'international-student': true,
        // youth: true,
      } as Record<string, boolean>,
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
    isShopOpen: false,
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
      x402ApiEnabled: false,
      ticketDiscountId: '2',
      // See development.pretix.gaItemId. null = fall back to the first
      // available admission item (set the production GA item ID here once
      // known to make the selection deterministic).
      gaItemId: 1 as number | null,
      testmode: false,
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
      cryptoDiscountPercent: 0,
      fiatEnabled: true,
      enabledTokens: ['ETH'] as readonly ('ETH' | 'USDC' | 'USDT0')[],
    },
    tax: {
      vatPercent: 18,
      label: 'GST',
    },
    self: {
      scope: 'india-resident',
      // TODO: change to false before tickets go live
      staging: false,
      requireEarlyAccess: false,
    },
    discount: {
      collection: 'india-resident',
      // See development.discount.communityPrefix.
      // TODO: remove before tickets go live
      communityPrefix: '',
      // Production Pretix item IDs. NOTE: the prod Self flow currently uses
      // `collection: 'india-early-bird'` above, but the configured Self discount
      // item is keyed `india-resident` (3). If the prod Self flow should issue
      // the India Resident item, set `collection` to 'india-resident'; otherwise
      // add an `india-early-bird` entry here. See redeem-self.ts.
      items: {
        'general-admission': 1,
        'core-devs': 44,
        'oss-contributors': 45,
        'pg-projects': 46,
        'past-attendees': 47,
        builder: 5,
        'india-resident': 3,
        'indian-student': 40,
        'international-student': 6,
        youth: 7,
      } as Record<string, number>,
      // See development.discount.soldOut. Uncomment a line to force sold out.
      soldOut: {
        // 'general-admission': true,
        // 'core-devs': true,
        // 'oss-contributors': true,
        // 'pg-projects': true,
        // 'past-attendees': true,
        // builder: true,
        // 'india-resident': true,
        // 'indian-student': true,
        // 'international-student': true,
        // youth: true,
      } as Record<string, boolean>,
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

/** Supabase voucher-pool collection name for a community discount `type`
 *  (e.g. `pg-projects`). Env-prefixed so dev and prod don't share pools in the
 *  one Supabase instance: `pg-projects` -> `test-pg-projects` (dev) /
 *  `pg-projects` (prod). */
export function discountCollection(type: string): string {
  return `${TICKETING.discount.communityPrefix}${type}`
}

/** Pretix item id for a community discount `type` (e.g. `oss-contributors`),
 *  or undefined if not configured for this environment. */
export function discountItem(type: string): number | undefined {
  return TICKETING.discount.items[type]
}

/** Whether a discount `type` is manually forced sold out via config
 *  (`discount.soldOut[type] === true`). Drives the proactive "Sold out" state
 *  on the store cards. The claim-time gate also enforces this, plus live Pretix
 *  quota for types not explicitly overridden. */
export function discountSoldOut(type: string): boolean {
  return TICKETING.discount.soldOut?.[type] === true
}

/** Recover the discount `type` from a voucher `collection` by stripping the env
 *  prefix (e.g. `test-india-resident` -> `india-resident`). */
export function discountTypeForCollection(collection: string): string {
  const prefix = TICKETING.discount.communityPrefix
  return collection.startsWith(prefix) ? collection.slice(prefix.length) : collection
}

/** Pretix item id for a voucher `collection` (e.g. `test-india-resident`).
 *  Strips the env prefix to recover the discount `type`, then looks up the
 *  item. Used by the Self flow, which works in collection terms. */
export function discountItemForCollection(collection: string): number | undefined {
  return discountItem(discountTypeForCollection(collection))
}

/** Whether the chain environment is testnet (derived from config) */
export const isTestnet = TICKETING.chainEnv !== 'mainnet'

/** Server-side only: get the Pretix API token for the active environment */
export function getPretixApiToken(): string {
  const token = TICKETING_ENV === 'production' ? process.env.PRETIX_API_TOKEN_PROD : process.env.PRETIX_API_TOKEN_DEV
  if (!token) throw new Error(`PRETIX_API_TOKEN_${TICKETING_ENV === 'production' ? 'PROD' : 'DEV'} is not set`)
  return token
}
