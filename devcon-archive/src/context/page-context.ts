import { createContext, useContext } from 'react'
import { NavigationData } from 'src/types/NavigationData'
import { Notification } from 'src/types/Notification'
import { Page } from 'src/types/Page'

export interface PageContextType {
  navigation: NavigationData
  notification: Notification
  location: any
  current: Page | undefined
  data: any
}

export const usePageContext = () => useContext<PageContextType | undefined>(PageContext)
export const PageContext = createContext<PageContextType | undefined>(undefined)
