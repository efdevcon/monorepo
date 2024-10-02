import { accountRouter } from '@/controllers/account'
import { dipsRouter } from '@/controllers/dips'
import { eventsRouter } from '@/controllers/events'
import { rssRouter } from '@/controllers/rss'
import { sessionsRouter } from '@/controllers/sessions'
import { speakersRouter } from '@/controllers/speakers'
import { aiRouter } from '@/controllers/ai'
import { hooksRouter } from '@/controllers/hooks'
import { pushNotificationRouter } from '@/controllers/push-notifications'
import { Router } from 'express'
import { API_INFO } from '@/utils/config'

export const router = Router()

router.get('/', (req, res) => {
  // #swagger.tags = ['Default']

  res.status(200).send({ status: 200, message: '', data: API_INFO })
})

router.use(accountRouter)
router.use(dipsRouter)
router.use(eventsRouter)
router.use(rssRouter)
router.use(sessionsRouter)
router.use(speakersRouter)
router.use(aiRouter)
router.use(hooksRouter)
router.use(pushNotificationRouter)
