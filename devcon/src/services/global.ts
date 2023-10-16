import { GetNavigationData } from 'services/navigation'
import { GetNotificationStrip, GetAppNotifications } from 'services/notifications'
import { getMessages, flattenMessages } from 'utils/intl'

export const getGlobalData = async (context: any, isApp?: boolean) => {
  const intl = await getMessages(context.locale, isApp)

  if (isApp) {
    return {
      messages: flattenMessages({ 
        global: {
          ...intl.global 
        },
        readmore: intl.readmore,
        'add-to-calendar': intl['add-to-calendar']
      }),
      appNotifications: GetAppNotifications()
    }
  }

  return {
    messages: intl,
    navigationData: await GetNavigationData(context.locale),
    notification: GetNotificationStrip(context.locale) || null,
  }
}
