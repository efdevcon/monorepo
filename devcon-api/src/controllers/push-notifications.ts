import { Request, Response, Router } from 'express'
import { PrismaClient } from '@/db/clients/account'

const prisma = new PrismaClient()

export const pushNotificationRouter = Router()

pushNotificationRouter.post('/subscriptions', subscribeToPushNotifications)
pushNotificationRouter.delete('/subscriptions', unsubscribeFromPushNotifications)

async function subscribeToPushNotifications(req: Request, res: Response) {
  // #swagger.tags = ['Push Notifications']
  const { endpoint, keys } = req.body

  if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
    return res.status(400).send({ status: 400, message: 'Endpoint and keys (auth and p256dh) are required', data: null })
  }

  try {
    await prisma.pushSubscription.create({
      data: {
        endpoint,
        auth: keys.auth,
        p256dh: keys.p256dh,
      },
    })
    res.status(201).send({ status: 201, message: 'Subscription successful', data: null })
  } catch (error) {
    console.error('Error subscribing to push notifications:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}

async function unsubscribeFromPushNotifications(req: Request, res: Response) {
  // #swagger.tags = ['Push Notifications']
  const { endpoint } = req.body

  if (!endpoint) {
    return res.status(400).send({ status: 400, message: 'Endpoint is required', data: null })
  }

  try {
    await prisma.pushSubscription.delete({
      where: { endpoint },
    })
    res.status(200).send({ status: 200, message: 'Unsubscription successful', data: null })
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}
