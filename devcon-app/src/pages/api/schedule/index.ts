import { NextApiRequest, NextApiResponse } from 'next'
import { fetchSessions } from 'services/event-data'
import { DEFAULT_MAX_CACHE_AGE, DEFAULT_REVALIDATE_PERIOD } from 'utils/constants';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const sessions = await fetchSessions()

        if (process.env.NODE_ENV === 'production') {
            res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${DEFAULT_MAX_CACHE_AGE}, stale-while-revalidate=${DEFAULT_REVALIDATE_PERIOD}`)
        }
        return res.status(200).send({ code: 200, message: '', data: sessions })
    }

    return res.status(400).send({ code: 400, message: 'Invalid method.' })
}

