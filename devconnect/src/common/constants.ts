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
export const TICKETS_URL = 'https://tickets.devconnect.org/?mtm_campaign=devconnect.org&mtm_source=website'
