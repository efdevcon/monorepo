import { NextApiRequest, NextApiResponse } from 'next'
import { UserAccountRepository } from "server/repositories/UserAccountRepository"
import { withSessionRoute } from "server/withIronSession"
import { UserAccount } from 'types/UserAccount'

const repo = new UserAccountRepository()

export default withSessionRoute(async function route(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query
    // console.log(req.method, '/api/account/[id]', id)
    
    if (req.method === 'PUT') {
        return put(req, res)
    }

    if (req.method === 'DELETE') {
        return del(req, res)
    }
})

async function put(req: NextApiRequest, res: NextApiResponse) {
    try {
        const paramId: string = JSON.stringify(req.query.id)
        const userId: string = JSON.stringify(req.session.userId)
        const account = req.body?.account as UserAccount

        if (!account) {
            return res.status(400).send({ code: 400, message: 'User account not provided.' })
        }

        if (paramId !== userId) {
            return res.status(405).send({ code: 405, message: 'Not allowed to update user account.' })
        }

        if (paramId === userId) {
            const updated = await repo.update(req.session.userId, account)
            if (updated) {
                return res.status(200).send({ code: 200, message: 'OK' })
            }

            return res.status(404).send({ code: 404, message: 'User account not found.' })
        }
    } catch (e) {
        console.error(e)
    }

    return res.status(500).send({ code: 500, message: 'Unable to update user account.' })
}

async function del(req: NextApiRequest, res: NextApiResponse) {
    try {
        const paramId: string = JSON.stringify(req.query.id)
        const userId: string = JSON.stringify(req.session.userId)

        if (paramId !== userId) {
            return res.status(405).send({ code: 405, message: 'Not allowed to delete user account.' })
        }

        if (paramId === userId) {
            const deleted = await repo.delete(req.session.userId)
            if (deleted) {
                req.session.destroy()
                return res.status(200).send({ code: 200, message: 'OK' })
            }

            return res.status(404).send({ code: 404, message: 'User account not found.' })
        }
    } catch (e) {
        console.error(e)
    }

    return res.status(500).send({ code: 500, message: 'Unable to delete user account.' })
}
