import { Request, Response, Router } from 'express'
import { SiweMessage, generateNonce } from 'siwe'

export const accountRouter = Router()
accountRouter.get(`/account`, GetAccount)
accountRouter.put(`/account/:id`, UpdateAccount)
accountRouter.delete(`/account/:id`, DeleteAccount)
accountRouter.post(`/account/token`, GetToken)
accountRouter.get(`/account/login/email`, LoginEmail)
accountRouter.get(`/account/login/token`, LoginToken)
accountRouter.get(`/account/login/web3`, LoginWeb3)
accountRouter.get(`/account/siwe/nonce`, Nonce)
accountRouter.get(`/account/siwe/verify`, Verify)
accountRouter.get(`/account/logout`, Logout)

async function GetAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function UpdateAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function DeleteAccount(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function GetToken(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function LoginEmail(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function LoginToken(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function LoginWeb3(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}

async function Nonce(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = generateNonce()

  res.status(200).send({ status: 200, message: '', data })
}

async function Verify(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const { message, signature } = req.body
  if (!message) return res.status(400).send({ code: 400, message: 'Message not provided.' })
  if (!signature) return res.status(400).send({ code: 400, message: 'Signature not provided.' })

  try {
    const siweMessage = new SiweMessage(message)
    await siweMessage.verify({ signature })

    return res.status(200).send({ status: 200, message: '', data: true })
  } catch (e) {
    console.error('Unable to verify message', e)
    return res.status(400).send({ status: 400, message: 'Unable to verify message', data: false })
  }
}

async function Logout(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}
