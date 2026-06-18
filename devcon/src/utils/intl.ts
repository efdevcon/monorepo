import enCommon from '../../content/en/intl/common.json'
import enHome from '../../content/en/intl/home.json'
import enDips from '../../content/en/intl/dips.json'
import enPastEvents from '../../content/en/intl/past_events.json'
import enEcosystemProgram from '../../content/en/intl/ecosystem_program.json'
import enSupportersProgram from '../../content/en/intl/supporters_program.json'
import enBlogs from '../../content/en/intl/blogs.json'
import enLantern from '../../content/en/intl/lantern.json'
import enTickets from '../../content/en/intl/tickets.json'
import enApplications from '../../content/en/intl/applications.json'
import enAbout from '../../content/en/intl/about.json'
import enRoadToDevcon from '../../content/en/intl/road_to_devcon.json'
import enAcademicProgram from '../../content/en/intl/academic_program.json'
import hiCommon from '../../content/hi/intl/common.json'
import hiHome from '../../content/hi/intl/home.json'
import hiDips from '../../content/hi/intl/dips.json'
import hiPastEvents from '../../content/hi/intl/past_events.json'
import hiEcosystemProgram from '../../content/hi/intl/ecosystem_program.json'
import hiSupportersProgram from '../../content/hi/intl/supporters_program.json'
import hiBlogs from '../../content/hi/intl/blogs.json'
import hiLantern from '../../content/hi/intl/lantern.json'
import hiTickets from '../../content/hi/intl/tickets.json'
import hiApplications from '../../content/hi/intl/applications.json'
import hiAbout from '../../content/hi/intl/about.json'
import hiRoadToDevcon from '../../content/hi/intl/road_to_devcon.json'
import hiAcademicProgram from '../../content/hi/intl/academic_program.json'
import mrCommon from '../../content/mr/intl/common.json'
import mrHome from '../../content/mr/intl/home.json'
import mrDips from '../../content/mr/intl/dips.json'
import mrPastEvents from '../../content/mr/intl/past_events.json'
import mrEcosystemProgram from '../../content/mr/intl/ecosystem_program.json'
import mrSupportersProgram from '../../content/mr/intl/supporters_program.json'
import mrBlogs from '../../content/mr/intl/blogs.json'
import mrLantern from '../../content/mr/intl/lantern.json'
import mrTickets from '../../content/mr/intl/tickets.json'
import mrApplications from '../../content/mr/intl/applications.json'
import mrAbout from '../../content/mr/intl/about.json'
import mrRoadToDevcon from '../../content/mr/intl/road_to_devcon.json'
import mrAcademicProgram from '../../content/mr/intl/academic_program.json'

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
    supporters_program: enSupportersProgram as Record<string, any>,
    blogs: enBlogs as Record<string, any>,
    lantern: enLantern as Record<string, any>,
    tickets: enTickets as Record<string, any>,
    applications: enApplications as Record<string, any>,
    about: enAbout as Record<string, any>,
    road_to_devcon: enRoadToDevcon as Record<string, any>,
    academic_program: enAcademicProgram as Record<string, any>,
  },
  hi: {
    common: hiCommon as Record<string, any>,
    home: hiHome as Record<string, any>,
    dips: hiDips as Record<string, any>,
    past_events: hiPastEvents as Record<string, any>,
    ecosystem_program: hiEcosystemProgram as Record<string, any>,
    supporters_program: hiSupportersProgram as Record<string, any>,
    blogs: hiBlogs as Record<string, any>,
    lantern: hiLantern as Record<string, any>,
    tickets: hiTickets as Record<string, any>,
    applications: hiApplications as Record<string, any>,
    about: hiAbout as Record<string, any>,
    road_to_devcon: hiRoadToDevcon as Record<string, any>,
    academic_program: hiAcademicProgram as Record<string, any>,
  },
  mr: {
    common: mrCommon as Record<string, any>,
    home: mrHome as Record<string, any>,
    dips: mrDips as Record<string, any>,
    past_events: mrPastEvents as Record<string, any>,
    ecosystem_program: mrEcosystemProgram as Record<string, any>,
    supporters_program: mrSupportersProgram as Record<string, any>,
    blogs: mrBlogs as Record<string, any>,
    lantern: mrLantern as Record<string, any>,
    tickets: mrTickets as Record<string, any>,
    applications: mrApplications as Record<string, any>,
    about: mrAbout as Record<string, any>,
    road_to_devcon: mrRoadToDevcon as Record<string, any>,
    academic_program: mrAcademicProgram as Record<string, any>,
  },
}

// Deep-merge: any key missing in `override` falls back to `base`. Arrays are
// taken whole-cloth from `override` if present, otherwise from `base` — we
// don't merge arrays element-wise.
function deepMerge<T extends Record<string, any>>(base: T, override: Partial<T>): T {
  const out: Record<string, any> = { ...base }
  for (const key of Object.keys(override) as (keyof T)[]) {
    const a = base[key]
    const b = override[key]
    if (b == null) continue
    if (Array.isArray(b)) {
      out[key as string] = b
    } else if (typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) {
      out[key as string] = deepMerge(a as Record<string, any>, b as Record<string, any>)
    } else {
      out[key as string] = b
    }
  }
  return out as T
}

export async function getMessages(locale: string, flatten?: boolean): Promise<Record<string, any>> {
  const normalized = locale === 'default' ? 'en' : locale
  const localeBundle = MESSAGES[normalized] ?? MESSAGES.en
  // Always merge on top of English so newly-added keys still resolve while
  // localized bundles catch up via the translation pipeline.
  const bundle = normalized === 'en' ? localeBundle : deepMerge(MESSAGES.en, localeBundle)
  return flatten ? flattenMessages(bundle) : bundle
}
