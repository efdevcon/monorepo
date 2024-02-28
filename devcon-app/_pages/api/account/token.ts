import moment from "moment";
import { NextApiRequest, NextApiResponse } from 'next'
import { VerificationTokenRepository } from "server/repositories/VerificationTokenRepository"
import { withSessionRoute } from "server/withIronSession"
import { EmailService } from "server/services/email-service"
import dbConnect from "utils/dbConnect"
import VerificationTokenModel from "server/models/VerificationTokenModel";
import { APP_URL } from "utils/constants"

const tokenRepo = new VerificationTokenRepository()

export default withSessionRoute(async function route(req: NextApiRequest, res: NextApiResponse) {
    console.log(req.method, '/api/account/token')

    if (req.method !== 'POST') {
        return res.status(404).send({ code: 404, message: '' })
    }

    await dbConnect()

    const identifier: string = req.body?.identifier
    const update: boolean = req.body?.update
    if (!identifier) {
        return res.status(400).send({ code: 400, message: 'Identifier not provided.' })
    }

    try {
        const isEmail = /\S+@\S+\.\S+/.test(identifier)
        const token = new VerificationTokenModel()
        token.identifier = identifier
        token.nonce = Math.floor(Math.random() * (99999999 - 10000000)) + 10000000
        token.expires = moment(Date.now()).add(20, 'minutes').toDate()

        let data = await tokenRepo.create(token)
        if (!data) {
            return res.status(500).send({ code: 500, message: 'Unable to create verification token.' })
        }

        if (isEmail) {
            const cta = update ? 'Confirm email' : 'Login using magic link'
            const magiclink = update ?
                `${req.headers.origin || APP_URL}/settings/email?token=${token.nonce}` :
                `${req.headers.origin || APP_URL}/login?token=${token.nonce}`

            const emailService = new EmailService()
            await emailService.sendMail(identifier, 'email-cta', `${token.nonce} is your Devcon verification code`, {
                TITLE: 'Confirm your email address',
                DESCRIPTION: `Please enter this verification code on Devcon.org\n

          ${token.nonce}\n
           
          This verification codes expires in 20 minutes.`,
                CALL_TO_ACTION: cta,
                URL: magiclink
            })

            data.nonce = -1 // only share nonce via email
        }

        req.session.tokenId = data?._id
        await req.session.save()
        return res.status(200).send({ code: 200, message: '', data: data })
    } catch (e) {
        console.error(e)
        res.status(500).send({ code: 500, message: 'Unable to generate security nonce.' })
    }
})
