import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from 'pages/api/auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'
import { getVoucherCodes } from 'utils/vouchers'

const client = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const id = req.query.id as string
    console.log(req.method, '/api/discounts/claim/[id]', id)
    
    const session = await getServerSession(req, res, authOptions)
    if (!session) return res.status(401).json({ error: 'Unauthorized' })

    const voucher = await getVoucherCodes('core-devs', 3)
    await client.discountClaims.upsert({
        where: {
            id: `${id}_${voucher}`,
        },
        update: {
            identifier: id,
            voucher: voucher,
        },
        create: {
            id: `${id}_${voucher}`,
            identifier: id,
            voucher: voucher,
        }
    })
    
    res.status(200).json({ data: {
        id,
        session,
        voucher: voucher,
    } })
}