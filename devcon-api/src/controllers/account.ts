import { Request, Response, Router } from 'express'

export const accountRouter = Router()
accountRouter.get(`/account`, GetAccount)
accountRouter.put(`/account/:id`, UpdateAccount)
accountRouter.delete(`/account/:id`, DeleteAccount)
accountRouter.post(`/account/token`, GetToken)
accountRouter.get(`/account/login/email`, LoginEmail)
accountRouter.get(`/account/login/token`, LoginToken)
accountRouter.get(`/account/login/web3`, LoginWeb3)
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

async function Logout(req: Request, res: Response) {
  // #swagger.tags = ['Account']
  const data = {}

  res.status(200).send({ status: 200, message: '', data })
}
