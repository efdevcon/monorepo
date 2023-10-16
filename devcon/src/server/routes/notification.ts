import { Router } from 'express'
import { NotificationController } from '../controllers/NotificationController'
import { NotificationRepository } from '../repositories/NotificationRepository'
import { UserAccountRepository } from '../repositories/UserAccountRepository'
// import { isAuthenticated } from '../strategies/web3'

// Register data model
require('../models/NotificationModel')
require('../models/UserAccountModel')

export const register = (router: Router) => {
  // const controller = new NotificationController(new NotificationRepository(), new UserAccountRepository());

  // router.post('/pwa/push_subscription', (req, res, next) => { req.user = '507f1f77bcf86cd799439011'; next(); }, controller.createSubscription)
  // router.delete('/pwa/push_subscription', (req, res, next) => { req.user = '507f1f77bcf86cd799439011'; next(); }, controller.deleteSubscription)
  // router.post('/pwa/notification', (req, res, next) => { req.user = '507f1f77bcf86cd799439011'; next(); }, controller.createNotification)
  // router.get('/pwa/notifications', (req, res, next) => { req.user = '507f1f77bcf86cd799439011'; next(); }, controller.getNotifications)
  // router.get('/pwa/test_push', (req, res, next) => { req.user = '507f1f77bcf86cd799439011'; next(); }, controller.testNotification);
  // router.get('/pwa/vapid', (req, res) => res.status(200).send(process.env.VAPID_PUBLIC));
  // router.get('/pwa/heartbeat', (req, res) => res.status(200).send('API WORKS'))
}
