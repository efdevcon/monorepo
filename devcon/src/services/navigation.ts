
import fs from 'fs'
import matter from 'gray-matter'
import { join } from "path"
import { Link } from 'types/Link'
import { NavigationData } from "types/NavigationData"
import { BASE_CONTENT_FOLDER } from 'utils/constants'
import { GetPage } from './page'

export async function GetNavigationData(lang: string = 'en'): Promise<NavigationData> {
    if (lang !== 'es') lang = 'en'

    return {
        top: await GetNavigation('top', lang),
        site: await GetNavigation('site', lang),
        footer: {
            bottom: await GetNavigation('footer-bottom', lang),
            highlights: await GetNavigation('footer-highlights', lang),
            left: await GetNavigation('footer-left', lang),
            right: await GetNavigation('footer-right', lang),
        },
    }
}

export async function GetNavigation(slug: string, lang: string = 'en'): Promise<Array<Link>> {
    if (lang !== 'es') lang = 'en'
    
    const filePath = join(process.cwd(), BASE_CONTENT_FOLDER, 'navigation', slug + '.md')
    let content
    try {
        content = await fs.promises.readFile(filePath, 'utf8')
    }
    catch (e) {
        // file not found.. ignore
    }

    if (!content) {
        console.log('File not found..', filePath)
        return []
    }

    const doc = matter(content)

    const links = await parseLinks(doc.data.links, lang)

    return links;
}

async function parseLinks(links: any[], lang: string): Promise<Array<Link>> {
    const parsedLinks = await Promise.all(links.map(async (i: any) => {
        if (i.type === 'page') {
            const page = await GetPage(i.slug, lang)

            if (page) {
                return {
                    title: page.title,
                    url: page.slug,
                    type: i.type
                }
            }
        }

        if (i.type === 'link') {
            const linkFilePath = join(process.cwd(), BASE_CONTENT_FOLDER, 'links', lang, i.slug + '.md')
            const linkContent = await fs.promises.readFile(linkFilePath, 'utf8')
            const linkDoc = matter(linkContent)

            return {
                title: linkDoc.data.title,
                url: linkDoc.data.url,
                type: i.type
            }
        }

        if (['header', 'links', 'app'].includes(i.type)) {
            const headerFilePath = join(process.cwd(), BASE_CONTENT_FOLDER, 'headers', lang, i.slug + '.md')
            const headerContent = await fs.promises.readFile(headerFilePath, 'utf8') 
            const headerDoc = matter(headerContent)

            if (i.type === 'links') {
                return {
                    title: headerDoc.data.title,
                    url: '#',
                    type: i.type,
                    links: await parseLinks(i.links, lang)
                }
            }

            if (i.type === 'app') {
                return {
                    title: headerDoc.data.title,
                    url: `/${i.slug}`,
                    noLocale: true,
                    type: i.type
                }
            }

            return {
                title: headerDoc.data.title,
                url: '#',
                type: i.type
            }
        }

        return {
            title: i.slug,
            url: i.slug,
            type: i.type
        }
    }))

    return parsedLinks;
}