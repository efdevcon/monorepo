import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import { Page } from 'types/Page'
import { Tag } from 'types/Tag'
import { BASE_CONTENT_FOLDER } from 'utils/constants'
import { DIP } from 'types/DIP'
import { Category } from 'types/Category'
import { FAQ } from 'types/FAQ'
import markdownUtils, { toHtml } from 'utils/markdown'
import { ContentSection, ContentSections } from 'types/ContentSection'
import { DevconEdition } from 'types/DevconEdition'
import { Track } from 'types/Track'

export async function GetPage(slug: string, lang: string = 'en'): Promise<Page | undefined> {
  if (lang !== 'es') lang = 'en'

  try {
    const filePath = join(process.cwd(), BASE_CONTENT_FOLDER, 'pages', lang, slug + '.md')
    const content = await fs.promises.readFile(filePath, 'utf8')

    if (!content) {
      console.log('File has no content..', filePath)
      return undefined
    }

    const doc = matter(content)
    const allTags = GetTags(lang)
    const tags: Array<string> = doc.data.tags ?? []

    const page = {
      ...doc.data,
      body: doc.content,
      lang: lang,
      id: slug,
      slug: `/${slug}`,
      tags: tags.map(i => allTags.find(x => x.slug === i)).filter(i => !!i),
    } as Page

    if (page.body) page.body = await markdownUtils.toHtml(page.body)

    return page
  } catch (e) {
    // page not found
  }
}

export function GetPages(lang: string = 'en'): Array<Page> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'pages', lang)
  return fs
    .readdirSync(dir)
    .map(i => {
      const content = fs.readFileSync(join(dir, i), 'utf8')
      if (!content) {
        console.log('File has no content..', i)
        return undefined
      }

      const doc = matter(content)
      const allTags = GetTags(lang)
      const tags: Array<string> = doc.data.tags ?? []
      return {
        ...doc.data,
        lang: lang,
        id: i.replace('.md', '').toLowerCase(),
        slug: `/${i.replace('.md', '').toLowerCase()}`,
        tags: tags.map(i => allTags.find(x => x.slug === i)).filter(i => !!i),
      } as Page
    })
    .filter(i => !!i) as Array<Page>
}

export async function GetCategories(lang: string = 'en'): Promise<Array<Category>> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'categories', lang)
  const faqs = await GetFAQ(lang)

  return fs
    .readdirSync(dir)
    .map(i => {
      const content = fs.readFileSync(join(dir, i), 'utf8')
      if (!content) {
        console.log('File has no content..', i)
        return undefined
      }

      const doc = matter(content)
      const id = i.replace('.md', '').toLowerCase()

      if (doc.data.excludeFromFAQ) return null

      return {
        id: id,
        title: doc.data.title,
        order: doc.data.order || null,
        questions: faqs.filter(x => x.category?.id === id),
      } as Category
    })
    .filter(i => !!i)
    .sort((a: any, b: any) => {
      // Defaulting to 0 for unordered items lets us shift items to the end by providing a negative order value (rather than having to order everything before it)
      const orderA = isNaN(a.order) ? 0 : a.order
      const orderB = isNaN(b.order) ? 0 : b.order

      return orderB - orderA
    }) as Array<Category>
}

export async function GetFAQ(lang: string = 'en'): Promise<Array<FAQ>> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'faq', lang)

  const directoryRead = await fs.promises.readdir(dir)

  const allFAQs = await Promise.all(
    directoryRead.map(async (fileName: string): Promise<FAQ | undefined> => {
      const content = fs.readFileSync(join(dir, fileName), 'utf8')
      if (!content) {
        console.log('File has no content..', fileName)
        return undefined
      }

      const doc = matter(content)

      const singleFaq = {
        ...doc.data,
        id: fileName.replace('.md', '').toLowerCase(),
        title: doc.data.title,
        body: await markdownUtils.toHtml(doc.content),
        order: doc.data.order ?? null,
        category: { id: doc.data.category },
      } as FAQ

      return singleFaq
    })
  )

  const filtered = allFAQs.filter(FAQ => !!FAQ) as FAQ[]

  return filtered.sort((a: any, b: any) => a.order - b.order)
}

export function GetTags(lang: string = 'en'): Array<Tag> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'tags', lang)

  return fs
    .readdirSync(dir)
    .map(i => {
      const content = fs.readFileSync(join(dir, i), 'utf8')
      if (!content) {
        console.log('File has no content..', i)
        return undefined
      }

      const doc = matter(content)
      return {
        ...doc.data,
        id: i.replace('.md', '').toLowerCase(),
        slug: i.replace('.md', '').toLowerCase(),
        title: doc.data.title,
        lang: lang,
      } as Tag
    })
    .filter(i => !!i) as Array<Tag>
}

export function GetDevconEditions(lang: string = 'en'): Array<DevconEdition> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'devcon', lang)

  return fs
    .readdirSync(dir)
    .map(i => {
      const content = fs.readFileSync(join(dir, i), 'utf8')
      if (!content) {
        console.log('File has no content..', i)
        return undefined
      }

      const doc = matter(content)
      let edition = {
        ...doc.data,
        id: i.replace('.md', '').toLowerCase(),
        links: doc.data.urls
          ? doc.data.urls.map((i: any) => {
              return { title: i.title, url: i.url }
            })
          : [],
      } as DevconEdition

      if (doc.data.startDate) edition.startDate = new Date(doc.data.startDate).getTime()
      if (doc.data.endDate) edition.endDate = new Date(doc.data.endDate).getTime()

      return edition
    })
    .filter(i => !!i) as Array<DevconEdition>
}

export function GetTracks(lang: string = 'en'): Array<Track> {
  if (lang !== 'es') lang = 'en'

  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'tracks', lang)

  return fs
    .readdirSync(dir)
    .map(i => {
      const content = fs.readFileSync(join(dir, i), 'utf8')
      if (!content) {
        console.log('File has no content..', i)
        return undefined
      }

      const doc = matter(content)
      return {
        id: i.replace('.md', '').toLowerCase(),
        slug: i.replace('.md', '').toLowerCase(),
        lang: lang,
        title: doc.data.title,
        body: doc.content,
        order: doc.data.order,
      } as Track
    })
    .sort((a: any, b: any) => a.order - b.order)
    .filter(i => !!i) as Array<Track>
}

export async function GetContentSection(slug: string, lang: string = 'en'): Promise<ContentSection | undefined> {
  if (lang !== 'es') lang = 'en'

  const filePath = join(process.cwd(), BASE_CONTENT_FOLDER, 'sections', lang, slug + '.md')

  let content

  try {
    content = await fs.promises.readFile(filePath, 'utf8')
  } catch (e) {
    // file not found.. ignore
  }

  if (!content) {
    console.log('File not found..', filePath)
    return
  }

  const doc = matter(content)
  return {
    id: slug,
    title: doc.data.title,
    body: await markdownUtils.toHtml(doc.content),
    data: {
      ...doc.data,
      left: doc.data?.left ? await markdownUtils.toHtml(doc.data.left) : null,
      right: doc.data?.right ? await markdownUtils.toHtml(doc.data.right) : null,
    },
  }
}

export function GetVideos(): Array<any> {
  const dir = join(process.cwd(), BASE_CONTENT_FOLDER, 'videos')

  return fs
    .readdirSync(dir)
    .map(i => {
      const content = fs.readFileSync(join(dir, i), 'utf8')
      if (!content) {
        console.log('File has no content..', i)
        return undefined
      }

      const doc = matter(content)
      return {
        ...doc.data,
      } as any
    })
    .filter(i => !!i) as Array<any>
}

export async function GetContentSections(slugs: string[], lang: string = 'en'): Promise<ContentSections> {
  let data: ContentSections = {}
  await Promise.all(
    slugs.map(async (slug: string) => {
      const section = await GetContentSection(slug, lang)
      if (section) data[slug] = section
      return section
    })
  )

  return data
}
