import React, { ComponentType } from 'react'
import { NavigationData } from 'types/NavigationData'
import { Notification } from 'types/Notification'
import { Page } from 'types/Page'
import { PageContext } from './page-context'
import { SEO } from 'components/domain/seo'
import moment from 'moment'

type Props = {
  data: any
  navigationData: NavigationData
  notification: Notification
  appNotifications: Notification[]
  page: Page
}

export const pageHOC =
  (PageContent: any, mapDataToContext?: (props: Props) => { [key: string]: any }) =>
  (props: Props) => {
    const context = {
      data: props.data,
      navigation: props.navigationData,
      notification: props.notification, // For notification strip - could probably rename this
      appNotifications: props.appNotifications,
      ...(mapDataToContext && mapDataToContext(props)),
      current: props.page,
    }

    if (props.page.lang === 'es') {
      require('moment/locale/es')
      moment.locale('es')
    } else {
      moment.locale('en')
    }

    return (
      <PageContext.Provider value={context}>
        <PageContent {...props} />
      </PageContext.Provider>
    )
  }
