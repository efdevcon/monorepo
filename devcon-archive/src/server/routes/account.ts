import { Router } from 'express'
import { UserController } from '../controllers/UserController'
import { UserAccountRepository } from '../repositories/UserAccountRepository'
import { isAuthenticated } from '../strategies/web3'

// Register data model
require('../models/UserAccountModel')

export const register = (router: Router) => {
  const repo = new UserAccountRepository()
  const controller = new UserController(repo)

  router.get('/account/nonce', controller.GetNonce.bind(controller))
  router.post('/account/login/web3', controller.LoginWeb3.bind(controller))
  router.post('/account/login/email', controller.LoginEmail.bind(controller))
  router.post('/account/login/email/verify', controller.VerifyEmail.bind(controller))
  router.post('/account/logout', isAuthenticated, controller.Logout.bind(controller))
  router.get('/account', isAuthenticated, controller.GetAccount.bind(controller))
  router.put('/account/:id', isAuthenticated, controller.UpdateAccount.bind(controller))
  router.delete('/account/:id', isAuthenticated, controller.DeleteAccount.bind(controller))
}
