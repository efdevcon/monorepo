import { NextApiRequest, NextApiResponse } from 'next'
import { withSessionRoute } from "server/withIronSession"

export default withSessionRoute(async function route(req: NextApiRequest, res: NextApiResponse) {
    console.log(req.method, '/api/account/logout')
    
    if (req.session.userId) {
        req.session.destroy()
        return res.status(200).send({ code: 200, message: 'OK' })
    }

    return res.status(500).send({ code: 500, message: 'Unable to logout' })
})