import { PushNotification } from 'types/PushNotification'
import { BaseRepository } from './BaseRepository'
import { INotificationRepository } from './interfaces/INotificationRepository'

console.log('registering data models')
require('server/models/NotificationModel')

export class NotificationRepository extends BaseRepository<PushNotification> implements INotificationRepository {
  constructor() {
    super('Notification')
  }
}
