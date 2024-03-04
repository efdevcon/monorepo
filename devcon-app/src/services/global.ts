import { GetAppNotifications } from 'services/notifications'

export const getGlobalData = async (context: any, isApp?: boolean) => {
  return {
    appNotifications: await GetAppNotifications()
  }
}
