import React from 'react'
import { useUrlParamsStore } from 'store/urlParams'

export const TITLE = 'Devconnect Argentina'
export const DESCRIPTION = 'A collaborative Ethereum week, built by and for everyone.'
export const SITE_URL =
  process.env.IS_LOCAL_DEV === 'true'
    ? 'http://localhost:3000/'
    : process.env.NODE_ENV === 'development'
      ? 'https://preview-repo.vercel.app/'
      : 'https://devconnect.org/'
export const IMAGE_OG = `${SITE_URL}og-argentina.png?reset=1`
export const SOCIAL_HANDLE = '@EFDevcon'
export const FARCASTE_HANDLE = '@devcon'

// Default TICKETS_URL
const DEFAULT_TICKETS_URL = 'https://tickets.devconnect.org/?mtm_campaign=devconnect.org&mtm_source=website'

// Hook to get dynamic TICKETS_URL with UTM parameters
export const useTicketsUrl = (): string => {
  const { mtm_campaign, mtm_kwd, mtm_content } = useUrlParamsStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Return default during SSR and initial render to avoid hydration mismatch
  if (!mounted) {
    return DEFAULT_TICKETS_URL
  }
  
  if (mtm_campaign || mtm_kwd || mtm_content) {
    const params = new URLSearchParams()
    if (mtm_campaign) params.set('mtm_campaign', mtm_campaign)
    if (mtm_kwd) params.set('mtm_kwd', mtm_kwd)
    if (mtm_content) params.set('mtm_content', mtm_content)
    
    return `https://tickets.devconnect.org/?${params.toString()}`
  }
  
  return DEFAULT_TICKETS_URL
}

// Export the default for backwards compatibility
export const TICKETS_URL = DEFAULT_TICKETS_URL
