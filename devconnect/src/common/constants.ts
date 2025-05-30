export const TITLE = 'Devconnect Argentina'
export const DESCRIPTION = 'A collaborative Ethereum week, built by and for everyone.'
export const SITE_URL =
  process.env.IS_LOCAL_DEV === 'true'
    ? 'http://localhost:3000/'
    : process.env.NODE_ENV === 'development'
      ? 'https://preview-repo.vercel.app/'
      : 'https://devconnect.org/'
export const IMAGE_OG = `${SITE_URL}og-argentina.png?reset=1`
export const SOCIAL_HANDLE = '@EFDevconnect'
export const FARCASTE_HANDLE = '@efdevconnect'
