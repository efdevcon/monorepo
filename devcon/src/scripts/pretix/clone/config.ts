/**
 * Resolves the source (prod) and target (dev) Pretix endpoints used by the
 * clone script, independent of NEXT_PUBLIC_PRETIX_ENV.
 *
 * Exits early if NEXT_PUBLIC_PRETIX_ENV is "production" to prevent writes
 * landing on a production-pointed target.
 */
import 'dotenv/config'
import { PretixEndpoint } from './types'

export interface ResolvedEndpoints {
  source: PretixEndpoint & { token: string }
  target: PretixEndpoint & { token: string }
}

const SOURCE_BASE_URL = 'https://mum.ticketh.xyz'
const SOURCE_ORGANIZER = 'devcon'
const SOURCE_EVENT = '8'

const TARGET_BASE_URL = 'https://dcdev2.ticketh.xyz'
const TARGET_ORGANIZER = 'org'
const TARGET_EVENT = '8'

export function resolveEndpoints(): ResolvedEndpoints {
  if (process.env.NEXT_PUBLIC_PRETIX_ENV === 'production') {
    console.error(
      'Refusing to run with NEXT_PUBLIC_PRETIX_ENV=production. The clone script writes to dev only.',
    )
    process.exit(2)
  }

  const sourceToken = process.env.PRETIX_API_TOKEN_PROD
  const targetToken = process.env.PRETIX_API_TOKEN_DEV
  if (!sourceToken) {
    console.error('PRETIX_API_TOKEN_PROD is not set (needed to read from source).')
    process.exit(2)
  }
  if (!targetToken) {
    console.error('PRETIX_API_TOKEN_DEV is not set (needed to write to target).')
    process.exit(2)
  }

  // Independent assertion: target must be on the dev host even if env vars drift.
  if (!TARGET_BASE_URL.includes('dcdev2.ticketh.xyz')) {
    console.error('Target base URL is not the dev host; aborting.')
    process.exit(2)
  }

  return {
    source: {
      baseUrl: SOURCE_BASE_URL,
      organizer: SOURCE_ORGANIZER,
      event: SOURCE_EVENT,
      token: sourceToken,
    },
    target: {
      baseUrl: TARGET_BASE_URL,
      organizer: TARGET_ORGANIZER,
      event: TARGET_EVENT,
      token: targetToken,
    },
  }
}

export function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : url + '/'
  if (!normalized.includes('/api/')) {
    normalized = normalized + 'api/v1/'
  }
  return normalized
}
