import { Router } from 'express'
import { TwitterController } from '../controllers/TwitterController'

export const register = (router: Router) => {
  const controller = new TwitterController()

  router.get('/tweets', controller.Test)
}
