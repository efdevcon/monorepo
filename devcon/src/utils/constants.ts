import intl from 'content/i18n/en.json' // Default language

export const SITE_URL = 'https://devcon.org/'
export const EMAIL_DEVCON = 'support@devcon.org'
export const LINK_ETHEREUM_FOUNDATION = 'https://ethereum.foundation'
export const COPYRIGHT_NOTICE = `© ${new Date().getFullYear()} — Ethereum Foundation. All Rights Reserved.`
export const STREAMING_URL = 'https://live.devcon.org/'

export const BASE_CONTENT_FOLDER = 'src/content'

export const EVENT_DAYS = [11, 12, 13, 14]

export const DEFAULT_REVALIDATE_PERIOD = 3600

export const DEFAULT_APP_PAGE = {
    title: intl.global.title,
    description: intl.global.description,
    template: 'index',
    tags: [],
    lang: 'en',
    id: 'index',
    slug: 'index'
}