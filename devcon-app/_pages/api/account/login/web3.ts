import { NextApiRequest, NextApiResponse } from 'next'
import UserAccountModel from "server/models/UserAccountModel"
import { UserAccountRepository } from "server/repositories/UserAccountRepository"
import { VerificationTokenRepository } from "server/repositories/VerificationTokenRepository"
import { withSessionRoute } from "server/withIronSession"
import { isValidSignature } from "utils/web3"

const repo = new UserAccountRepository()
const tokenRepo = new VerificationTokenRepository()

export default withSessionRoute(async function route(req: NextApiRequest, res: NextApiResponse) {
    console.log(req.method, '/api/account/login/web3')

    if (req.method !== 'POST') {
        return res.status(404).send({ code: 404, message: '' })
    }

    const id: string = req.session.tokenId
    if (!id) {
        return res.status(400).send({ code: 400, message: 'No session token.' })
    }

    const address: string = req.body.address
    const nonce: number = req.body.nonce
    const msg: string = req.body.msg
    const signed: string = req.body.signed
    if (!address || !nonce || !msg || !signed) {
        return res.status(400).send({ code: 400, message: 'Invalid input.' })
    }

    const validSignature = isValidSignature(address, msg, signed)
    if (!validSignature) {
        return res.status(400).send({ code: 400, message: 'Invalid signature.' })
    }

    const data = await tokenRepo.findValidVerificationToken(address, nonce)
    if (!data) {
        return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
    }

    const userId = req.session.userId
    // if a session exists => add address to existing account
    if (userId) {
        let userAccount = await repo.findUserAccountByAddress(address)
        if (userAccount) {
            return res.status(400).send({ code: 400, message: 'Unable to add wallet address.' }) // TODO: wallet address already exists
        }

        userAccount = await repo.findOne(userId)
        if (!userAccount) {
            const model = new UserAccountModel()
            model.addresses.push(address)
            model.activeAddress = address

            userAccount = await repo.create(model)
            if (userAccount) {
                return res.status(200).send({ code: 200, message: '', data: userAccount })
            }
            
            return res.status(400).send({ code: 400, message: 'Unable to create user account.' })
        }

        userAccount = { ...userAccount, addresses: [...userAccount.addresses, address], activeAddress: address }
        const updated = await repo.update(userId, userAccount)
        if (updated) {
            // SUCCESS - No need to update session, userId remains the same
            return res.status(200).send({ code: 200, message: '', data: userAccount })
        }

        return res.status(500).send({ code: 500, message: 'Unable to login with Web3.' })
    }

    // else; start new session
    let userAccount = await repo.findUserAccountByAddress(address)
    if (userAccount) {
        req.session.userId = userAccount._id

        await req.session.save()
        return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    const model = new UserAccountModel()
    model.addresses.push(address)
    userAccount = await repo.create(model)
    if (userAccount) {
        req.session.userId = userAccount._id

        await req.session.save()
        return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
})