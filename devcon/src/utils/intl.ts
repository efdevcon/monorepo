import enCommon from '../../content/en/intl/common.json'
import enHome from '../../content/en/intl/home.json'
import enDips from '../../content/en/intl/dips.json'
import enPastEvents from '../../content/en/intl/past_events.json'
import enEcosystemProgram from '../../content/en/intl/ecosystem_program.json'
import enBlogs from '../../content/en/intl/blogs.json'
import enLantern from '../../content/en/intl/lantern.json'
import enTickets from '../../content/en/intl/tickets.json'
import enApplications from '../../content/en/intl/applications.json'
import enAbout from '../../content/en/intl/about.json'
import hiCommon from '../../content/hi/intl/common.json'
import hiHome from '../../content/hi/intl/home.json'
import hiDips from '../../content/hi/intl/dips.json'
import hiPastEvents from '../../content/hi/intl/past_events.json'
import hiEcosystemProgram from '../../content/hi/intl/ecosystem_program.json'
import hiBlogs from '../../content/hi/intl/blogs.json'
import hiLantern from '../../content/hi/intl/lantern.json'
import hiTickets from '../../content/hi/intl/tickets.json'
import hiApplications from '../../content/hi/intl/applications.json'
import hiAbout from '../../content/hi/intl/about.json'

export function flattenMessages(nestedMessages: any, prefix = '') {
  return Object.keys(nestedMessages).reduce((messages: any, key) => {
    let value = nestedMessages[key]
    let prefixedKey = prefix ? `${prefix}_${key}` : key

    if (typeof value === 'string') {
      messages[prefixedKey] = value
    } else {
      Object.assign(messages, flattenMessages(value, prefixedKey))
    }

    return messages
  }, {})
}

type MessageBundle = Record<string, Record<string, any>>

const MESSAGES: Record<string, MessageBundle> = {
  en: {
    common: enCommon as Record<string, any>,
    home: enHome as Record<string, any>,
    dips: enDips as Record<string, any>,
    past_events: enPastEvents as Record<string, any>,
    ecosystem_program: enEcosystemProgram as Record<string, any>,
    blogs: enBlogs as Record<string, any>,
    lantern: enLantern as Record<string, any>,
    tickets: enTickets as Record<string, any>,
    applications: enApplications as Record<string, any>,
    about: enAbout as Record<string, any>,
  },
  hi: {
    common: hiCommon as Record<string, any>,
    home: hiHome as Record<string, any>,
    dips: hiDips as Record<string, any>,
    past_events: hiPastEvents as Record<string, any>,
    ecosystem_program: hiEcosystemProgram as Record<string, any>,
    blogs: hiBlogs as Record<string, any>,
    lantern: hiLantern as Record<string, any>,
    tickets: hiTickets as Record<string, any>,
    applications: hiApplications as Record<string, any>,
    about: hiAbout as Record<string, any>,
  },
}

export async function getMessages(locale: string, flatten?: boolean): Promise<Record<string, any>> {
  const normalized = locale === 'default' ? 'en' : locale
  const bundle = MESSAGES[normalized] ?? MESSAGES.en
  return flatten ? flattenMessages(bundle) : bundle
}
