import { Request, Response, Router } from 'express'
import { PrismaClient } from '@/db/clients/account'
import webpush from 'web-push'

webpush.setVapidDetails('mailto:devcon-website@ethereum.org', process.env.VAPID_PUBLIC as string, process.env.VAPID_PRIVATE as string)

const prisma = new PrismaClient()

export const pushNotificationRouter = Router()

pushNotificationRouter.post('/push-subscriptions', subscribeToPushNotifications)
pushNotificationRouter.delete('/push-subscriptions', unsubscribeFromPushNotifications)
pushNotificationRouter.post('/notifications', addPushNotifications)
pushNotificationRouter.delete('/notifications/:id', deletePushNotifications)
pushNotificationRouter.get('/notifications', getNotifications)
// pushNotificationRouter.post('/notifications/send', sendPushNotification)

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
        userId: userId || 'dev_mock_user',
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
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    // res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }

  // Always return
  res.status(200).send({ status: 200, message: 'Unsubscription successful', data: null })
}

// async function sendPushNotification(req: Request, res: Response) {
//   const { title, body } = req.body

//   // Temporary block, we'll add auth later
//   if (process.env.NODE_ENV !== 'development') {
//     return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
//   }

//   if (!title || !body) {
//     return res.status(400).send({ status: 400, message: 'Title and body are required', data: null })
//   }

//   try {
//     const subscriptions = await prisma.pushSubscription.findMany()

//     const results = await Promise.allSettled(
//       subscriptions.map(async (subscription) => {
//         const pushSubscription = {
//           endpoint: subscription.endpoint,
//           keys: {
//             auth: subscription.auth,
//             p256dh: subscription.p256dh,
//           },
//         }

//         const payload = JSON.stringify({ title, body })

//         return webpush.sendNotification(pushSubscription, payload)
//       })
//     )

//     const successfulNotifications = results.filter((result) => result.status === 'fulfilled').length
//     const failedNotifications = results.filter((result) => result.status === 'rejected').length

//     console.log(`Sent ${successfulNotifications} push notifications successfully, ${failedNotifications} failed`)

//     res.status(200).send({
//       status: 200,
//       message: 'Notifications sent',
//       data: { successfulNotifications, failedNotifications },
//     })
//   } catch (error) {
//     console.error('Error sending push notifications:', error)
//     res.status(500).send({ status: 500, message: 'Internal server error', data: null })
//   }
// }

async function addPushNotifications(req: Request, res: Response) {
  const userId = req.session.userId as string

  // Temporary block, we'll add auth later
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
  }

  if (!userId && process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ code: 403, message: 'Login required.' })
  }

  const { title, message, sendAt } = req.body

  if (!title || !message || !sendAt) {
    return res.status(400).send({ status: 400, message: 'Title, message, and sendAt are required', data: null })
  }

  try {
    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        sendAt: new Date(sendAt),
        createdBy: userId || 'no user, development mode',
      },
    })
    res.status(201).send({ status: 201, message: 'Notification created', data: notification })
  } catch (error) {
    console.error('Error creating notification:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}

async function deletePushNotifications(req: Request, res: Response) {
  const userId = req.session.userId as string

  // Temporary block, we'll add auth later
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
  }

  if (!userId && process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ code: 403, message: 'Login required.' })
  }

  const { id } = req.params

  if (!id) {
    return res.status(400).send({ status: 400, message: 'Notification ID is required', data: null })
  }

  try {
    await prisma.notification.delete({
      where: { id },
    })
    res.status(200).send({ status: 200, message: 'Notification deleted', data: null })
  } catch (error) {
    console.error('Error deleting notification:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}

async function getNotifications(req: Request, res: Response) {
  const userId = req.session.userId as string

  // Temporary block, we'll add auth later
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
  }

  if (!userId && process.env.NODE_ENV !== 'development') {
    return res.status(403).send({ code: 403, message: 'Login required.' })
  }

  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { sendAt: 'desc' },
    })
    res.status(200).send({ status: 200, message: 'Notifications retrieved', data: notifications })
  } catch (error) {
    console.error('Error retrieving notifications:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}

async function sendScheduledNotifications() {
  console.log('Sending scheduled notifications')

  try {
    const notifications = await prisma.$transaction(async (tx) => {
      const now = new Date()

      const notificationsToSend = await tx.notification.findMany({
        where: {
          sendAt: { lte: now },
          sent: false,
        },
      })

      await tx.notification.updateMany({
        where: {
          id: { in: notificationsToSend.map((n) => n.id) },
        },
        data: { sent: true },
      })

      return notificationsToSend
    })

    for (const notification of notifications) {
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

          const payload = JSON.stringify({
            title: notification.title,
            body: notification.message,
          })

          return webpush.sendNotification(pushSubscription, payload)
        })
      )

      const successfulNotifications = results.filter((result) => result.status === 'fulfilled').length
      const failedNotifications = results.filter((result) => result.status === 'rejected').length

      console.log(`Sent scheduled notification ${notification.id}: ${successfulNotifications} successful, ${failedNotifications} failed`)

      // Mark the notification as sent
      await prisma.notification.update({
        where: { id: notification.id },
        data: { sent: true, sentSuccessfullyCount: successfulNotifications, failedToSendCount: failedNotifications },
      })
    }
  } catch (error) {
    console.error('Error sending scheduled notifications:', error)
  }
}

// Set up the function to run every 5 minutes
setInterval(sendScheduledNotifications, 5 * 60 * 1000)
