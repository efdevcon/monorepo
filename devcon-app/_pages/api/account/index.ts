import { NextApiRequest, NextApiResponse } from 'next'
import { UserAccountRepository } from "server/repositories/UserAccountRepository"
import { withSessionRoute } from "server/withIronSession"
import dbConnect from 'utils/dbConnect'

const repo = new UserAccountRepository()

export default withSessionRoute(async function route(req: NextApiRequest, res: NextApiResponse) {
    console.log(req.method, '/api/account', req.session.userId)

    if (!req.session.userId) {
        // return as HTTP 200 OK 
        return res.status(200).send({ code: 401, message: 'userId session not found.' })
    }

    await dbConnect()

    try {
        const data = await repo.findOne(req.session.userId)
        if (data) {
            return res.status(200).send({ code: 200, message: '', data: data })
        }
    } catch (e) {
        console.error(e)
    }

    return res.status(500).send({ code: 500, message: 'Unable to get user account.' })
})
