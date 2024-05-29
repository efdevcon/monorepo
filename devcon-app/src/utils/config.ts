
export const SITE_CONFIG = {
  NAME: 'Devcon SEA',
  DESCRIPTION: 'Customize your Devcon experience.',
  URL: 'https://app.devcon.org',
}

export const APP_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',

  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.devcon.org', // 'http://localhost:4000',

  WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',

  INFURA_APIKEY: process.env.NEXT_PUBLIC_INFURA_APIKEY || '',
  ETHERSCAN_APIKEY: process.env.NEXT_PUBLIC_ETHERSCAN_APIKEY || '',
  ALCHEMY_APIKEY: process.env.NEXT_PUBLIC_ALCHEMY_APIKEY || '',
}
;(() => {
  if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    console.error('You need to provide a NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID env variable')
  }
  if (!process.env.NEXT_PUBLIC_INFURA_APIKEY) {
    console.warn('NEXT_PUBLIC_INFURA_APIKEY is not provided')
  }
  if (!process.env.NEXT_PUBLIC_ALCHEMY_APIKEY) {
    console.error('NEXT_PUBLIC_ALCHEMY_APIKEY is not provided')
  }
})()
