export interface UserAccount {
  id: string
  username?: string
  email?: string
  activeAddress?: string
  addresses: Array<string>
  disabled: boolean
  pushSubscription: any,
  role?: string
  yearsOfExperience?: number
  tracks: string[]
  tags: string[]
  speakers: Array<string>
  sessions: Array<{
    id: string
    level: 'interested' | 'attending'
    start: Date
    end: Date
  }>
  publicSchedule?: boolean
  notifications?: boolean
  createdAt: Date
  updatedAt: Date
}
