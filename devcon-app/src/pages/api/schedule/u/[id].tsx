import { NextApiRequest, NextApiResponse } from 'next'
import { DEFAULT_MAX_CACHE_AGE, DEFAULT_REVALIDATE_PERIOD } from 'utils/constants'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        const { id } = req.query
        const agenda = { publicSchedule: {} } // TODO: Move to Devcon API

        if (process.env.NODE_ENV === 'production') {
            res.setHeader('Cache-Control', `public, max-age=0, s-maxage=${DEFAULT_MAX_CACHE_AGE}, stale-while-revalidate=${DEFAULT_REVALIDATE_PERIOD}`)
        }
        if (agenda?.publicSchedule) {
            return res.status(200).send({ code: 200, message: '', data: {} })
        }

        return res.status(400).send({ code: 400, message: 'Unable to fetch personalized agenda.' })
    }

    return res.status(400).send({ code: 400, message: 'Invalid method.' })
}
