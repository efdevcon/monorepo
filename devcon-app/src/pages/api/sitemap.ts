import { NextApiRequest, NextApiResponse } from "next"
import { GetPages } from "services/page"
import { SITE_URL } from "utils/constants"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    const baseUrl = SITE_URL
    const currentDate = new Date().toISOString()
    const launchDate = new Date(2022, 2).toISOString()

    const pages = [...GetPages('en'), GetPages('es')].flat()

    // PWA Release
    // <url>
    //     <loc>${baseUrl}app</loc>
    //     <lastmod>${launchDate}</lastmod>
    //     <changefreq>daily</changefreq>
    //     <priority>0.8</priority>
    // </url>

    const priorities = ['blogs', 'devcon-week', 'dips', 'faq', 'news', 'tickets', 'program']
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url>
                <loc>${baseUrl}</loc>
                <lastmod>${currentDate}</lastmod>
                <changefreq>daily</changefreq>
                <priority>1.0</priority>
            </url>

            ${pages.map(i => {
        if (i.id === '404') return ``
        if (priorities.includes(i.id)) {
            return `<url>
                        <loc>${baseUrl}${i.lang}${i.slug}</loc>
                        <lastmod>${currentDate}</lastmod>
                        <changefreq>weekly</changefreq>
                        <priority>0.8</priority>
                    </url>`
        }
        return `<url>
                        <loc>${baseUrl}${i.lang}${i.slug}</loc>
                        <lastmod>${launchDate}</lastmod>
                        <changefreq>monthly</changefreq>
                        <priority>0.6</priority>
                    </url>`
    })}
        </urlset>`

    res.setHeader('Content-Type', 'text/xml')
    res.write(sitemap)
    res.end()
}
