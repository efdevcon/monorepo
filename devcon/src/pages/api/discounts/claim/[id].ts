import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'pages/api/auth/[...nextauth]'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const id = req.query.id as string
    console.log(req.method, '/api/discounts/claim/[id]', id)
    
    const session = await getServerSession(req, res, authOptions)
    if (!session) return res.status(401).json({ error: 'Unauthorized' })
    
    res.status(200).json({ data: {
        id,
        session,
        voucher: 'DISCOUNT-123',
    } })
}