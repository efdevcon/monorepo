/**
 * Fetch Pretix event settings (custom text fields, presale config, etc.)
 * Run with: pnpm run pretix:test-settings
 */
import 'dotenv/config'

function normalizeBaseUrl(url: string): string {
  let normalized = url.endsWith('/') ? url : `${url}/`
  if (!normalized.includes('/api/')) {
    normalized = `${normalized}api/v1/`
  }
  return normalized
}

const baseUrl = normalizeBaseUrl(process.env.PRETIX_BASE_URL || 'https://ticketh.xyz/api/v1/')
const apiToken = process.env.PRETIX_API_TOKEN
const organizerName = process.env.PRETIX_ORGANIZER || 'devcon'
const eventName = process.env.PRETIX_EVENT || '7'

async function fetchSettings() {
  console.log('=== Fetching Event Settings ===\n')

  if (!apiToken) {
    console.error('Error: PRETIX_API_TOKEN environment variable is not set')
    process.exit(1)
  }

  try {
    const response = await fetch(
      `${baseUrl}organizers/${organizerName}/events/${eventName}/settings/`,
      { headers: { Authorization: `Token ${apiToken}` } }
    )

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error('Response:', text)
      return
    }

    const settings = await response.json()

    // Extract English value from localized objects like {"en": "...", "de": "..."}
    // Also handles arrays of localized objects like confirm_texts
    const locale = 'en'
    function localize(val: unknown): unknown {
      if (Array.isArray(val)) return val.map(localize)
      if (val && typeof val === 'object') {
        const obj = val as Record<string, unknown>
        if (locale in obj) return obj[locale]
      }
      return val
    }

    // Show text fields first
    const textKeys = Object.keys(settings).filter(
      k =>
        k.includes('text') ||
        k.includes('message') ||
        k.includes('presale') ||
        k.includes('frontpage') ||
        k.includes('checkout') ||
        k.includes('banner') ||
        k.includes('footer') ||
        k.includes('header') ||
        k.includes('mail') ||
        k.includes('confirm')
    )

    if (textKeys.length > 0) {
      console.log('── Custom text / message fields (en) ──\n')
      for (const key of textKeys.sort()) {
        const val = localize(settings[key])
        if (val && val !== '' && val !== null && !(typeof val === 'object' && Object.keys(val).length === 0)) {
          console.log(`  ${key}:`, typeof val === 'object' ? JSON.stringify(val, null, 4) : val)
        } else {
          console.log(`  ${key}: (empty)`)
        }
      }
    }

    // Localize all settings for the dump
    const localized: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(settings)) {
      localized[k] = localize(v)
    }

    console.log('\n── All settings (en) ──\n')
    console.log(JSON.stringify(localized, null, 2))
  } catch (error) {
    console.error('Error fetching settings:', error)
  }
}

fetchSettings()
