import Parser from "rss-parser"
import slugify from "slugify"
import { BlogPost } from "types/BlogPost"

const defaultMaxItems = 6

export async function GetBlogs(maxItems: number = defaultMaxItems): Promise<Array<BlogPost>> {
    const parser: Parser = new Parser({
        customFields: {
            item: ['description'],
        },
    })

    const feed = await parser.parseURL('https://blog.ethereum.org/feed/category/devcon.xml')
    const blogs = feed.items.map(i => {
        return {
            id: slugify(i.title ?? ''),
            title: i.title,
            description: i.description,
            date: i.pubDate ? new Date(i.pubDate).getTime() : 0,
            author: 'Devcon Team',
            body: i['content:encoded'] || i.description,
            slug: slugify(i.title ?? ''),
            permaLink: i.link,
            imageUrl: i.enclosure ? i['enclosure'].url : '',
        } as BlogPost
    })

    return blogs.slice(0, maxItems)
}