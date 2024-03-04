import React, { ComponentType } from 'react'
import { NavigationData } from 'types/NavigationData'
import { Notification } from 'types/Notification'
// import { Page } from 'types/Page'
import { PageContext } from './page-context'
// import { SEO } from 'components/domain/seo'
// import moment from 'moment'
// import { fetchSessions, fetchSpeakers } from 'services/event-data'

import { DEFAULT_APP_PAGE } from 'utils/constants'

type Props = {
  navigationData: NavigationData
  notification: Notification
  appNotifications: Notification[]
  // page: Page
  [key: string]: any
}

export const pageHOC = (PageContent: ComponentType<Props>) => (props: Props) => {
  const context = {
    navigation: props.navigationData,
    notification: props.notification, // For notification strip - could probably rename this
    appNotifications: [], // props.appNotifications,
    // ...(mapDataToContext && mapDataToContext(props)),
    // current: props.page,
    current: DEFAULT_APP_PAGE,
  }

  return (
    // @ts-ignore
    <PageContext.Provider value={context}>
      <PageContent {...props} />
    </PageContext.Provider>
  )
}
