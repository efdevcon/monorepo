export interface PushNotification {
  _id?: any
  content: {
    title: string
    message: string
  }
  pushed?: boolean,
  recipient?: any
}
