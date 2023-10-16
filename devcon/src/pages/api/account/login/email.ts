import next, { NextApiRequest, NextApiResponse } from 'next'
import UserAccountModel from 'server/models/UserAccountModel'
import { UserAccountRepository } from 'server/repositories/UserAccountRepository'
import { VerificationTokenRepository } from 'server/repositories/VerificationTokenRepository'
import { withSessionRoute } from "server/withIronSession"

const repo = new UserAccountRepository()
const tokenRepo = new VerificationTokenRepository()

export default withSessionRoute(async function route(req: NextApiRequest, res: NextApiResponse) {
    console.log(req.method, '/api/account/login/email')

    const id: string = req.session.tokenId
    if (!id) {
        return res.status(400).send({ code: 400, message: 'No session token.' })
    }

    const address: string = req.body.address
    const nonce: number = req.body.nonce
    if (!address || !nonce) {
        return res.status(400).send({ code: 400, message: 'Invalid input.' })
    }

    const data = await tokenRepo.findValidVerificationToken(address, nonce)
    if (!data) {
        return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
    }

    const userId = req.session.userId
    // if a session exists => add email to existing account
    if (userId) {
        let userAccount = await repo.findUserAccountByEmail(address)
        if (userAccount) {
            return res.status(400).send({ code: 400, message: 'Unable to add email address.' }) // TODO: email address already exists
        }

        userAccount = await repo.findOne(userId)
        if (!userAccount) {
            return res.status(400).send({ code: 400, message: 'Invalid session.' })
        }

        userAccount = { ...userAccount, email: address }
        const updated = await repo.update(userId, userAccount)
        if (updated) {
            // SUCCESS - No need to update session, userId remains the same
            return res.status(200).send({ code: 200, message: '', data: userAccount })
        }

        return res.status(500).send({ code: 500, message: 'Unable to add email address.' })
    }

    // else; create new user account based on email address
    let userAccount = await repo.findUserAccountByEmail(address)
    if (userAccount) {
        req.session.userId = userAccount._id

        await req.session.save()
        return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    if (!userAccount) {
        const model = new UserAccountModel()
        model.email = address
        userAccount = await repo.create(model)

        if (userAccount) {
            req.session.userId = userAccount._id
            await req.session.save()
            return res.status(200).send({ code: 200, message: '', data: userAccount })
        }

        return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
    }

    return res.status(500).send({ code: 500, message: 'Unable to login with email account.' })
})