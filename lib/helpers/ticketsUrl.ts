/**
 * Add UTM parameters from localStorage to any URL
 */
export function addUtmParams(baseUrl: string): string {
  if (typeof window === 'undefined') {
    return baseUrl
  }

  try {
    const storedParams = localStorage.getItem('devconnect_utm_params')
    if (!storedParams) {
      return baseUrl
    }

    const params = JSON.parse(storedParams)
    if (!params || typeof params !== 'object') {
      return baseUrl
    }

    const { mtm_campaign, mtm_kwd, mtm_content } = params

    if (mtm_campaign || mtm_kwd || mtm_content) {
      const url = new URL(baseUrl)
      if (mtm_campaign) url.searchParams.set('mtm_campaign', mtm_campaign)
      if (mtm_kwd) url.searchParams.set('mtm_kwd', mtm_kwd)
      if (mtm_content) url.searchParams.set('mtm_content', mtm_content)

      return url.toString()
    }
  } catch (error) {
    console.error('Error adding UTM params to URL:', error)
  }

  return baseUrl
}

/**
 * Check if a URL should get UTM parameters (devconnect.org subdomains or ticketh.xyz)
 */
export function isDevconnectUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return (
      urlObj.hostname.endsWith('.devconnect.org') || 
      urlObj.hostname === 'devconnect.org' ||
      urlObj.hostname.endsWith('.ticketh.xyz') ||
      urlObj.hostname === 'ticketh.xyz'
    )
  } catch {
    return false
  }
}

/**
 * Get the tickets URL with UTM parameters from localStorage if available
 */
export function getTicketsUrl(): string {
  const DEFAULT_TICKETS_URL = 'https://tickets.devconnect.org/?mtm_campaign=devconnect.org&mtm_source=website'

  if (typeof window === 'undefined') {
    return DEFAULT_TICKETS_URL
  }

  try {
    const storedParams = localStorage.getItem('devconnect_utm_params')
    if (!storedParams) {
      return DEFAULT_TICKETS_URL
    }

    const params = JSON.parse(storedParams)
    if (!params || typeof params !== 'object') {
      return DEFAULT_TICKETS_URL
    }

    const { mtm_campaign, mtm_kwd, mtm_content } = params

    if (mtm_campaign || mtm_kwd || mtm_content) {
      const urlParams = new URLSearchParams()
      if (mtm_campaign) urlParams.set('mtm_campaign', mtm_campaign)
      if (mtm_kwd) urlParams.set('mtm_kwd', mtm_kwd)
      if (mtm_content) urlParams.set('mtm_content', mtm_content)

      return `https://tickets.devconnect.org/?${urlParams.toString()}`
    }
  } catch (error) {
    console.error('Error reading UTM params from localStorage:', error)
  }

  return DEFAULT_TICKETS_URL
}

