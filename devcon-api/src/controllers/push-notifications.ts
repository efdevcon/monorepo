import { Request, Response, Router, NextFunction } from 'express'
import { PrismaClient } from '@/db/clients/account'
import webpush from 'web-push'

interface CustomRequest extends Request {
  isAdmin?: boolean
}

webpush.setVapidDetails('mailto:devcon-website@ethereum.org', process.env.VAPID_PUBLIC as string, process.env.VAPID_PRIVATE as string)

const prisma = new PrismaClient()

export const pushNotificationRouter = Router()

const whitelist = [
  'cm233cak10002lxqfrjktv79a',
  'cm2kystr5001ogoa7zkxay23l',
  'clw802l3m0023arj8oi1y3qho',
  'clw802l4a0110arj85elqodpr',
  'clw802l3l0000arj8ztdk6c9f',
  'cm30ck3og001norhz179r8727',
]

const isAdmin = (req: CustomRequest, res: Response, next: NextFunction) => {
  const userId = req.session.userId as string

  if (whitelist.includes(userId)) {
    req.isAdmin = true
  }

  next()
}

pushNotificationRouter.post('/push-subscriptions', subscribeToPushNotifications)
pushNotificationRouter.delete('/push-subscriptions', unsubscribeFromPushNotifications)
// KEEP IN MIND "ISADMIN" IS NOT AUTHENTICATION - IT ONLY WRITES "isAdmin" TO THE REQUEST OBJECT - HANDLE PERMISSIONS IN THE ROUTE HANDLER
pushNotificationRouter.post('/notifications', isAdmin, addPushNotifications)
pushNotificationRouter.delete('/notifications/:id', isAdmin, deletePushNotifications)
pushNotificationRouter.get('/notifications', isAdmin, getNotifications)

async function subscribeToPushNotifications(req: Request, res: Response) {
  const userId = req.session.userId as string

  if (!userId) {
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
        userId: userId,
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
  const userId = req.session.userId as string

  if (!userId) {
    return res.status(403).send({ code: 403, message: 'Login required.' })
  }

  const { endpoint } = req.body

  if (!endpoint) {
    return res.status(400).send({ status: 400, message: 'Endpoint is required', data: null })
  }

  try {
    await prisma.pushSubscription.delete({
      where: {
        endpoint: endpoint,
        userId: userId,
      },
    })
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
  }

  // Always return
  res.status(200).send({ status: 200, message: 'Unsubscription successful', data: null })
}

async function addPushNotifications(req: CustomRequest, res: Response) {
  const userId = req.session.userId as string

  if (!req.isAdmin) {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
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

async function deletePushNotifications(req: CustomRequest, res: Response) {
  if (!req.isAdmin) {
    return res.status(403).send({ status: 403, message: 'Not allowed', data: null })
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

async function getNotifications(req: CustomRequest, res: Response) {
  // const userId = req.session.userId as string

  // if (!userId) {
  //   return res.status(403).send({ code: 403, message: 'Login required.' })
  // }

  try {
    const search = {
      orderBy: { sendAt: 'desc' },
    } as any

    // Admins can see all notifications
    if (!req.isAdmin) {
      search.where = {
        sendAt: {
          lte: new Date(), // Only fetch notifications with sendAt in the past or present
        },
      }
    }

    const notifications = await prisma.notification.findMany(search)

    res.status(200).send({ status: 200, message: 'Notifications retrieved', data: notifications })
  } catch (error) {
    console.error('Error retrieving notifications:', error)
    res.status(500).send({ status: 500, message: 'Internal server error', data: null })
  }
}

async function sendScheduledNotifications() {
  console.log('Sending scheduled notifications...')

  try {
    const notifications = await prisma.$transaction(async (tx: any) => {
      const now = new Date()

      const notificationsToSend = await tx.notification.findMany({
        where: {
          sendAt: { lte: now },
          sent: false,
        },
      })

      await tx.notification.updateMany({
        where: {
          id: { in: notificationsToSend.map((n: any) => n.id) },
        },
        data: { sent: true },
      })

      return notificationsToSend
    })

    for (const notification of notifications) {
      const subscriptions = await prisma.pushSubscription.findMany()

      const results = await Promise.allSettled(
        subscriptions.map(async (subscription: any) => {
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

      const successfulNotifications = results.filter((result: any) => result.status === 'fulfilled').length
      const failedNotifications = results.filter((result: any) => result.status === 'rejected').length

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

  console.log('Scheduled notifications (if any) sent on:', new Date().toISOString())
}

sendScheduledNotifications()

// Set up the function to run every 5 minutes
setInterval(sendScheduledNotifications, 5 * 60 * 1000)
