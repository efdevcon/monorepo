import { NextApiRequest, NextApiResponse } from "next"
import { APP_CONFIG } from "utils/config"
import { SITE_URL } from "utils/constants"

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    if (APP_CONFIG.NODE_ENV === 'production') {
        return res.send(`User-agent: *
Allow: /
Sitemap: ${SITE_URL}sitemap.xml
        `)
    }

    return res.send(`User-agent: *
Disallow: /`)
}