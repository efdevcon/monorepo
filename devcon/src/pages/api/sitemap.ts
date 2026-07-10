import { NextApiRequest, NextApiResponse } from 'next'
import { SITE_URL } from 'utils/constants'

const LOCALES = ['en', 'hi', 'mr']

// Public, indexable routes (no locale prefix, trailing slash to match `trailingSlash: true`).
// Transactional, personal, and admin routes (checkout, /ticket/, signin, admin, forms) are deliberately excluded.
const ROUTES = [
  { path: '', changefreq: 'daily', priority: '1.0' },
  { path: 'tickets/', changefreq: 'weekly', priority: '0.8' },
  { path: 'tickets/store/', changefreq: 'weekly', priority: '0.8' },
  { path: 'tickets/faq/', changefreq: 'weekly', priority: '0.8' },
  { path: 'speaker-applications/', changefreq: 'weekly', priority: '0.8' },
  { path: 'blogs/', changefreq: 'weekly', priority: '0.8' },
  { path: 'about/', changefreq: 'monthly', priority: '0.6' },
  { path: 'academic-program/', changefreq: 'monthly', priority: '0.6' },
  { path: 'application-guidelines/', changefreq: 'monthly', priority: '0.6' },
  { path: 'code-of-conduct/', changefreq: 'monthly', priority: '0.6' },
  { path: 'dips/', changefreq: 'monthly', priority: '0.6' },
  { path: 'ecosystem-program/', changefreq: 'monthly', priority: '0.6' },
  { path: 'past-events/', changefreq: 'monthly', priority: '0.6' },
  { path: 'road-to-devcon/', changefreq: 'monthly', priority: '0.6' },
  { path: 'supporters/', changefreq: 'monthly', priority: '0.6' },
  { path: 'parental-consent-form/', changefreq: 'monthly', priority: '0.4' },
  { path: 'privacy-notice/', changefreq: 'monthly', priority: '0.4' },
  { path: 'terms-of-service/', changefreq: 'monthly', priority: '0.4' },
]

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const entries = ROUTES.flatMap(route =>
    LOCALES.map(
      locale => `    <url>
        <loc>${SITE_URL}${locale}/${route.path}</loc>
        <changefreq>${route.changefreq}</changefreq>
        <priority>${route.priority}</priority>
    </url>`
    )
  ).join('\n')

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`

  res.setHeader('Content-Type', 'text/xml')
  res.write(sitemap)
  res.end()
}
