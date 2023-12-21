import { Request, Response } from 'express'
import webPush from 'web-push';
import { PushNotification } from 'types/PushNotification'
import { INotificationRepository } from '../repositories/interfaces/INotificationRepository'
import { IUserAccountRepository } from '../repositories/interfaces/IUserAccountRepository'
import { Types } from 'mongoose';

require('dotenv').config();

webPush.setVapidDetails(
  'mailto:devcon-website@ethereum.org',
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

export class NotificationController {
  private _repository: INotificationRepository
  private _userRepository: IUserAccountRepository

  constructor(repository: INotificationRepository, userRepository: IUserAccountRepository) {
    this._repository = repository
    this._userRepository = userRepository

    this.createSubscription = this.createSubscription.bind(this);
    this.getNotifications = this.getNotifications.bind(this);
    this.createNotification = this.createNotification.bind(this);
    this.testNotification = this.testNotification.bind(this);
    this.deleteSubscription = this.deleteSubscription.bind(this);
  }

  private async pushNotification(userID: string, subscriptions: any) {
    try {
      const subscription = subscriptions[userID];

      await webPush.sendNotification(subscription, 'Hello from NotificationController');

      console.log('Push Application Server - Notification sent to ' + subscription.endpoint);
    } catch(e) {
      console.error(e, 'Send Message Failed - Cancelling subscription');

      await this.unsubscribe(userID);
    }
  }

  public async createNotification(req: Request, res: Response) {
    try {
      await this._repository.create({ content: { title: 'Testing PWA Push notifications', message: 'Lorem ipsum message body etc' }});
      await this._repository.create({ content: { title: 'Testing PWA Push notifications', message: 'Lorem ipsum message body etc' }, recipient: req.user });

      res.status(200).send({ code: 200, message: 'OK', data: 'Notification created' })
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Notification not created' })
    }
  }

  public async getNotifications(req: Request, res: Response) {
    try {
      const result = await this._repository._model.find({ recipient: req.user });

      res.status(200).send(result);
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Couldnt fetch notifications' })
    }
  }

  public async pushNotifications(req: Request, res: Response) {
    try {
      // 1. Get notifications that have yet to be pushed
      const pendingNotifications = await this._repository._model.find({ pushed: { $eq: false }});
      
      // 2. Query the necessary subscriptions based on the pending notifications
      const subscriptions = await (async () => {
        const subscriptions = {} as { [key: string]: any };
        const isGlobalPush = pendingNotifications.some(notification => !notification.recipient);

        let query = {};

        if (isGlobalPush) {
          query = { pushSubscription: { $exists: true } };
        } else {
          const recipientIDs = new Set();
  
          pendingNotifications.forEach(notification => {
            if (notification.recipient) {
              recipientIDs.add(notification.recipient);
            }
          });

          query = { _id: { $in: Array.from(recipientIDs) } };
        }

        const recipients = await this._userRepository._model.find(query, '_id pushSubscription');

        recipients.forEach(({ _id, pushSubscription }) => {
          subscriptions[_id] = pushSubscription;
        })

        return subscriptions;
      })();

      // 3. Send out notifications
      pendingNotifications.map(notification => {
        const isGlobalNotification = !notification.recipient;

        if (isGlobalNotification) {
          Object.entries(subscriptions).forEach(() => {

          })
        } else {

        }

        // sendNotification(notification.recipient)
      });

      // 4. Mark notifications as sent

      // For each result, fetch the user subscription, and send the notification

      // res.json(result);

      res.send('under construction :-)')
    } catch (e) {
      console.error(e)
      res.status(500).send({ code: 500, message: 'Yikes' })
    }
  }

  private async unsubscribe(userID: string) {
    try {
      await this._userRepository._model.updateOne({ _id: Types.ObjectId(userID) }, { $unset: { pushSubscription: 1 }}); 
    } catch(e) {
      console.error(e, 'Unsubscribe failed');

      throw e;
    }
  }

  private async subscribe(userID: string, subscription: any) {
    try {
      await this._userRepository._model.updateOne({ _id: Types.ObjectId(userID) }, { $set: { pushSubscription: subscription } });
    } catch(e) {
      console.error(e, 'Subscribe failed');

      throw e;
    }
  }

  public async createSubscription(req: Request, res: Response) {
    await this.subscribe(req.user, req.body);

    res.status(200).send({ code: 200, message: 'OK', data: 'Subscribed' })
  }

  public async deleteSubscription(req: Request, res: Response) {
    await this.unsubscribe(req.user);

    res.status(200).send({ code: 200, message: 'OK', data: 'Unsubscribed' })
  }

  public async testNotification(req: Request, res: Response) {
    const user = await this._userRepository._model.findById(Types.ObjectId(req.user));
    await this.pushNotification(req.user, { [req.user]: user.pushSubscription });
    // console.log(user)

    // console.log(subs, 'subs');

    // const queue = Object.entries(subs).map(([user, sub]) => {
    //   console.log( user, sub, 'user sub')
    //   return this.pushNotification(user, sub);
    // }); 

    // await Promise.all(queue);

    res.status(200).send({ code: 200, message: 'OK', data: 'Message sent!' })
  }
}
