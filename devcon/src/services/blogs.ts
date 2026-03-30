import Parser from 'rss-parser'
import slugify from 'slugify'
import { BlogPost } from 'types/BlogPost'

const defaultMaxItems = 1000000

// Edition classification rules — order matters, first match wins
const EDITION_RULES: { keywords: string[]; edition: string; after?: string; before?: string }[] = [
  { keywords: ['devcon 8', 'devcon india', 'mumbai'], edition: 'Devcon 8 India' },
  { keywords: ['devconnect arg', 'devconnect 2025', 'world\'s fair', 'buenos aires'], edition: 'Devconnect ARG', after: '2025-01-01' },
  { keywords: ['devcon sea', 'devcon 7', 'devcon 2024', 'bangkok'], edition: 'Devcon SEA', after: '2023-12-01', before: '2025-06-01' },
  { keywords: ['devconnect istanbul', 'devconnect ist', 'devconnect is back'], edition: 'Devconnect IST', after: '2023-01-01', before: '2023-12-31' },
  { keywords: ['devcon vi', 'devcon 6', 'devcon: hacia colombia', 'bogot'], edition: 'Devcon VI', after: '2021-06-01', before: '2023-06-01' },
  { keywords: ['devconnect', 'wrapping up devconnect'], edition: 'Devconnect AMS', after: '2022-01-01', before: '2022-12-31' },
  { keywords: ['devcon5', 'devcon 5', 'osaka'], edition: 'Devcon V', after: '2019-01-01', before: '2020-12-31' },
  { keywords: ['devcon4', 'dc⟠ıv', 'devcon 4'], edition: 'Devcon iv', after: '2018-01-01', before: '2019-01-01' },
  { keywords: ['devcon3', 'devcon 3'], edition: 'devcon three', after: '2017-01-01', before: '2018-01-01' },
  { keywords: ['devcon2', 'devcon 2', 'shanghai'], edition: 'devcon two', after: '2016-01-01', before: '2017-01-01' },
  { keywords: ['devcon1', 'devcon 1', 'devcon one'], edition: 'DEVCON 1', after: '2015-01-01', before: '2016-01-01' },
  { keywords: ['devcon-0', 'devcon 0', 'ÐΞVcon-0'], edition: 'DEV CON 0', before: '2015-01-01' },
]

function classifyEdition(title: string, date: number): string {
  const titleLower = title.toLowerCase()
  const dateStr = new Date(date).toISOString()

  for (const rule of EDITION_RULES) {
    const keywordMatch = rule.keywords.some(k => titleLower.includes(k.toLowerCase()))
    if (!keywordMatch) continue

    if (rule.after && dateStr < rule.after) continue
    if (rule.before && dateStr > rule.before) continue

    return rule.edition
  }

  // Fallback: classify by date ranges for generic posts
  if (date >= new Date('2026-01-01').getTime()) return 'Devcon 8 India'
  if (date >= new Date('2025-01-01').getTime()) return 'Devconnect ARG'
  if (date >= new Date('2024-01-01').getTime()) return 'Devcon SEA'
  if (date >= new Date('2023-01-01').getTime()) return 'Devconnect IST'
  if (date >= new Date('2022-01-01').getTime()) return 'Devcon VI'
  if (date >= new Date('2021-01-01').getTime()) return 'Devcon VI'
  if (date >= new Date('2019-01-01').getTime()) return 'Devcon V'
  if (date >= new Date('2018-01-01').getTime()) return 'Devcon iv'
  if (date >= new Date('2017-01-01').getTime()) return 'devcon three'
  if (date >= new Date('2016-01-01').getTime()) return 'devcon two'
  if (date >= new Date('2015-01-01').getTime()) return 'DEVCON 1'
  return 'DEV CON 0'
}

export async function GetBlogs(maxItems: number = defaultMaxItems): Promise<Array<BlogPost>> {
  try {
    const parser: Parser = new Parser({
      customFields: {
        item: ['description'],
      },
    })

    const feed = await parser.parseURL('https://blog.ethereum.org/en/events/feed.xml')
    const blogs = feed.items
      .filter(i => i.categories?.some(category => category === 'Devcon' || category === 'Devconnect'))
      .map(i => {
        const isManual = slugify(i.title ?? '') === 'The-Devcon-VI-Manual'
        const date = i.pubDate ? new Date(i.pubDate).getTime() : 0

        return {
          id: slugify(i.title ?? ''),
          title: i.title,
          description: i.description,
          date,
          author: 'Devcon Team',
          body: i['content:encoded'] || i.description,
          slug: slugify(i.title ?? ''),
          permaLink: i.link,
          imageUrl: isManual ? '/assets/images/manual.webp' : i.enclosure ? i['enclosure'].url : '',
          edition: classifyEdition(i.title ?? '', date),
        } as BlogPost
      })

    return blogs.slice(0, maxItems)
  } catch (error) {
    console.error('[GetBlogs] Failed to fetch blog RSS feed:', error)
    return []
  }
}

// Ordered list of editions for display
export const EDITION_ORDER = [
  'Devcon 8 India',
  'Devconnect ARG',
  'Devcon SEA',
  'Devconnect IST',
  'Devcon VI',
  'Devconnect AMS',
  'Devcon V',
  'Devcon iv',
  'devcon three',
  'devcon two',
  'DEVCON 1',
  'DEV CON 0',
]
