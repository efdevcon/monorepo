import { Request, Response, Router } from 'express'
import { PrismaClient } from '@/db/clients/account'
import webpush from 'web-push'

webpush.setVapidDetails('mailto:devcon-website@ethereum.org', process.env.VAPID_PUBLIC as string, process.env.VAPID_PRIVATE as string)

const prisma = new PrismaClient()

export const pushNotificationRouter = Router()

pushNotificationRouter.post('/push-subscriptions', subscribeToPushNotifications)
pushNotificationRouter.delete('/push-subscriptions', unsubscribeFromPushNotifications)
pushNotificationRouter.post('/send-notification', sendPushNotification)

async function subscribeToPushNotifications(req: Request, res: Response) {
  const userId = req.session.userId as string

  // Temporary block, we'll add auth later
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
  }

  if (!userId && process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ code: 403, message: 'Login required.' })
  }

  const { endpoint, keys } = req.body

  if (!endpoint || !keys || !keys.auth || !keys.p256dh) {
    return res.status(400).send({ status: 400, message: 'Endpoint and keys (auth and p256dh) are required', data: null })
  }

  try {
    await prisma.pushSubscription.create({
      data: {
        endpoint,
        userId,
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
  const userId = req.session.userId

  // Temporary block, we'll add auth later
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
  }

  if (!userId && process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ code: 403, message: 'Login required.' })
  }

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

async function sendPushNotification(req: Request, res: Response) {
  const { title, body } = req.body

  // Temporary block, we'll add auth later
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
  }

  if (!title || !body) {
    return res.status(400).send({ status: 400, message: 'Title and body are required', data: null })
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany()

    const results = await Promise.allSettled(
      subscriptions.map(async (subscription) => {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            auth: subscription.auth,
            p256dh: subscription.p256dh,
          },
        }

        const payload = JSON.stringify({ title, body })

        return webpush.sendNotification(pushSubscription, payload)
      })
    )

    const successfulNotifications = results.filter((result) => result.status === 'fulfilled').length
    const failedNotifications = results.filter((result) => result.status === 'rejected').length

    console.log(`Sent ${successfulNotifications} push notifications successfully, ${failedNotifications} failed`)

    res.status(200).send({
      status: 200,
      message: 'Notifications sent',
      data: { successfulNotifications, failedNotifications },
    })
  } catch (error) {
    console.error('Error sending push notifications:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}
