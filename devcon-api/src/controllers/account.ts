import { Request, Response, Router } from 'express'
import { API_INFO } from 'utils/config'
import { PrismaClient } from 'db/clients/account'
import { UserAccount } from 'types/accounts'
import { sendMail } from 'services/email'
import { isValidSignature } from 'utils/web3'
import dayjs from 'dayjs'

const client = new PrismaClient()

export const accountRouter = Router()
accountRouter.get(`/account`, GetAccount)
accountRouter.put(`/account/:id`, UpdateAccount)
accountRouter.delete(`/account/:id`, DeleteAccount)
accountRouter.post(`/account/token`, Token)
accountRouter.post(`/account/login/email`, LoginEmail)
accountRouter.post(`/account/login/token`, LoginToken)
accountRouter.post(`/account/login/web3`, LoginWeb3)
accountRouter.post(`/account/logout`, Logout)

async function GetAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const userId = req.session.userId
  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId session not found.' })
  }

  const account = await client.account.findFirst({ where: { id: userId } })
  if (account) {
    return res.status(200).send({ code: 200, message: '', data: account })
  }

  res.status(500).send({ code: 500, message: 'Unable to get user account.' })
}

async function UpdateAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const paramId = req.query.id as string
  const userId = req.session.userId
  const account = req.body?.account as UserAccount

  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId session not found.' })
  }

  if (!account) {
    return res.status(400).send({ code: 400, message: 'Account not provided.' })
  }

  if (paramId !== userId) {
    return res.status(403).send({ code: 403, message: 'not allowed to update account.' })
  }

  try {
    const updated = await client.account.update({ where: { id: paramId }, data: account })
    if (updated) {
      return res.status(200).send({ code: 200, message: 'OK', data: account })
    }
  } catch (e) {
    console.error('Unable to update account', e)
    return res.status(404).send({ code: 404, message: 'User account not found.' })
  }
}

async function DeleteAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const paramId = req.query.id as string
  const userId = req.session.userId

  if (!userId) {
    // return as HTTP 200 OK
    return res.status(200).send({ code: 401, message: 'userId session not found.' })
  }

  if (paramId !== userId) {
    return res.status(403).send({ code: 403, message: 'not allowed to update account.' })
  }

  try {
    const deleted = await client.account.delete({ where: { id: paramId } })
    if (deleted) {
      req.session.destroy((e) => console.debug('Session destroyed', e))
      return res.status(200).send({ code: 200, message: 'OK' })
    }
  } catch (e) {
    console.error('Unable to delete account', e)
    return res.status(404).send({ code: 404, message: 'User account not found.' })
  }
}

async function Token(req: any, res: Response) {
  // #swagger.tags = ['Account']
  // #swagger.parameters['body'] = { in: 'body', schema: { identifier: 'your@email.com' } }

  const identifier = req.body?.identifier as string
  const update = Boolean(req.body?.update)
  if (!identifier) {
    return res.status(400).send({ code: 400, message: 'Identifier not provided.' })
  }

  try {
    const isEmail = /\S+@\S+\.\S+/.test(identifier)
    const nonce = Math.floor(Math.random() * (99999999 - 10000000)) + 10000000

    let data = await client.verificationToken.create({
      data: {
        identifier: identifier,
        nonce: nonce,
        expires: dayjs(Date.now()).add(20, 'minutes').toDate(),
      },
    })

    if (!data) {
      return res.status(500).send({ code: 500, message: 'Unable to create verification token.' })
    }

    if (isEmail) {
      const cta = update ? 'Confirm email' : 'Login using magic link'
      const magiclink = update
        ? `${req.headers.origin || API_INFO.website}/settings/email?token=${nonce}`
        : `${req.headers.origin || API_INFO.website}/login?token=${nonce}`

      await sendMail(identifier, 'email-cta', `${nonce} is your Devcon verification code`, {
        TITLE: 'Confirm your email address',
        DESCRIPTION: `Please enter this verification code on Devcon.org\n

      ${nonce}\n
       
      This verification codes expires in 20 minutes.`,
        CALL_TO_ACTION: cta,
        URL: magiclink,
      })

      data.nonce = -1 // only share nonce via email
    }

    req.session.tokenId = data?.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: data })
  } catch (e) {
    console.error(e)
    res.status(500).send({ code: 500, message: 'Unable to generate security nonce.' })
  }
}

async function LoginEmail(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const id = req.session.tokenId
  if (!id) {
    return res.status(400).send({ code: 400, message: 'No session token.' })
  }

  let address = req.body.address as string
  const nonce = Number(req.body.nonce)
  if (!address || !nonce || isNaN(nonce)) {
    return res.status(400).send({ code: 400, message: 'Invalid input.' })
  }

  let data = await client.verificationToken.findFirst({
    where: { identifier: address, nonce: nonce, expires: { gt: new Date() } },
  })
  if (!data) {
    data = await client.verificationToken.findFirst({
      where: { id: id, nonce: nonce, expires: { gt: new Date() } },
    })

    if (!data) {
      return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
    }
    address = data.identifier
  }

  const userId = req.session.userId
  // if a session exists => add email to existing account
  if (userId) {
    let userAccount = await client.account.findFirst({ where: { email: address } })
    if (userAccount) {
      return res.status(400).send({ code: 400, message: 'Unable to add email address.' }) // TODO: email address already exists
    }

    userAccount = await client.account.findFirst({ where: { id: userId } })
    if (!userAccount) {
      return res.status(400).send({ code: 400, message: 'Invalid session.' })
    }

    userAccount = { ...userAccount, email: address }
    const updated = await client.account.update({ where: { id: userId }, data: userAccount })
    if (updated) {
      // SUCCESS - No need to update session, userId remains the same
      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to add email address.' })
  }

  // else; create new user account based on email address
  let userAccount = await client.account.findFirst({ where: { email: address } })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  if (!userAccount) {
    userAccount = await client.account.create({ data: { email: address } })

    if (userAccount) {
      req.session.userId = userAccount.id
      req.session.save()

      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
  }

  return res.status(500).send({ code: 500, message: 'Unable to login with email account.' })
}

async function LoginToken(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const id = req.session.tokenId as string
  if (!id) {
    return res.status(400).send({ code: 400, message: 'No session token.' })
  }

  const nonce: number = req.body.nonce
  if (!nonce) {
    return res.status(400).send({ code: 400, message: 'Invalid input.' })
  }

  const data = await client.verificationToken.findFirst({
    where: { id: id, nonce: nonce, expires: { gt: new Date() } },
  })
  if (!data) {
    return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
  }

  const userId = req.session.userId
  const address = data.identifier
  // if a session exists => add email to existing account
  if (userId) {
    let userAccount = await client.account.findFirst({
      where: { email: address },
    })
    if (userAccount) {
      return res.status(400).send({ code: 400, message: 'Unable to add email address.' }) // TODO: email address already exists
    }

    userAccount = await client.account.findFirst({ where: { id: userId } })
    if (!userAccount) {
      return res.status(400).send({ code: 400, message: 'Invalid session.' })
    }

    userAccount = { ...userAccount, email: address }
    const updated = await client.account.update({ where: { id: userId }, data: userAccount })
    if (updated) {
      // SUCCESS - No need to update session, userId remains the same
      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to add email address.' })
  }

  // else; create new user account based on email address
  let userAccount = await client.account.findFirst({ where: { email: address } })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  if (!userAccount) {
    userAccount = await client.account.create({ data: { email: address } })

    if (userAccount) {
      req.session.userId = userAccount.id
      req.session.save()

      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
  }

  return res.status(500).send({ code: 500, message: 'Unable to login with email account.' })
}

async function LoginWeb3(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const id = req.session.tokenId as string
  if (!id) {
    return res.status(400).send({ code: 400, message: 'No session token.' })
  }

  const address = req.body.address as string
  const nonce = Number(req.body.nonce)
  const msg = req.body.msg as string
  const signed = req.body.signed as string
  if (!address || !msg || !signed || !nonce || isNaN(nonce)) {
    return res.status(400).send({ code: 400, message: 'Invalid input.' })
  }

  const validSignature = isValidSignature(address, msg, signed)
  if (!validSignature) {
    return res.status(400).send({ code: 400, message: 'Invalid signature.' })
  }

  const data = await client.verificationToken.findFirst({
    where: { identifier: address, nonce: nonce, expires: { gt: new Date() } },
  })
  if (!data) {
    return res.status(400).send({ code: 400, message: 'No valid verification token found.' })
  }

  const userId = req.session.userId
  // if a session exists => add address to existing account
  if (userId) {
    let userAccount = await client.account.findFirst({ where: { email: address } })
    if (userAccount) {
      return res.status(400).send({ code: 400, message: 'Unable to add wallet address.' }) // TODO: wallet address already exists
    }

    userAccount = await client.account.findFirst({ where: { id: userId } })
    if (!userAccount) {
      userAccount = await client.account.create({
        data: {
          addresses: [address],
          activeAddress: address,
        },
      })

      if (userAccount) {
        return res.status(200).send({ code: 200, message: '', data: userAccount })
      }

      return res.status(400).send({ code: 400, message: 'Unable to create user account.' })
    }

    userAccount = { ...userAccount, addresses: [...userAccount.addresses, address], activeAddress: address }
    const updated = await client.account.update({ where: { id: userId }, data: userAccount })
    if (updated) {
      // SUCCESS - No need to update session, userId remains the same
      return res.status(200).send({ code: 200, message: '', data: userAccount })
    }

    return res.status(500).send({ code: 500, message: 'Unable to login with Web3.' })
  }

  // else; start new session
  let userAccount = await client.account.findFirst({ where: { addresses: { has: address } } })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  userAccount = await client.account.create({ data: { addresses: [address], activeAddress: address } })
  if (userAccount) {
    req.session.userId = userAccount.id
    req.session.save()

    return res.status(200).send({ code: 200, message: '', data: userAccount })
  }

  return res.status(500).send({ code: 500, message: 'Unable to create new user.' })
}

async function Logout(req: Request, res: Response) {
  // #swagger.tags = ['Account']

  const session = req.session
  if (session) {
    session.destroy((e) => console.debug('Session destroyed', e))
    return res.status(200).send({ code: 200, message: '', data: false })
  }

  res.status(500).send({ status: 500, message: 'Unable to logout', data: false })
}
