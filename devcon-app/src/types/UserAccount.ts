import { Session } from "./Session"

export interface UserAccount {
  _id?: any
  username?: string
  email?: string
  activeAddress?: string
  addresses: Array<string>
  disabled: boolean
  pushSubscription: any,
  appState: AppState
  createdAt: Date
  updatedAt: Date
}

export interface AppState {
  createdAt: Date
  updatedAt: Date
  speakers: Array<string>
  sessions: Array<{
    id: string
    level: 'interested' | 'attending',
    start: Date
    end: Date
  }>
  publicSchedule?: boolean
}

export interface UserSchedule {
  userId: string,
  username: string,
  publicSchedule?: boolean,
  sessions: Session[]
}