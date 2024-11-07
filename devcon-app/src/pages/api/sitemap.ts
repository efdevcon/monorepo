import { NextApiRequest, NextApiResponse } from 'next'
import { APP_URL, SITE_URL } from 'utils/constants'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = APP_URL
  const currentDate = new Date().toISOString()
  const launchDate = new Date(2024, 10).toISOString()

  const priorities = ['schedule', 'speakers']
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            <url>
                <loc>${baseUrl}</loc>
                <lastmod>${currentDate}</lastmod>
                <changefreq>daily</changefreq>
                <priority>1.0</priority>
            </url>

            ${priorities.map(i => {
              return `<url>
                        <loc>${baseUrl}${i}</loc>
                        <lastmod>${currentDate}</lastmod>
                        <changefreq>weekly</changefreq>
                        <priority>0.8</priority>
                    </url>`
            })}
        </urlset>`

  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()
}
