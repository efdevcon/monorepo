export interface UserAccount {
  id: string
  username?: string
  email?: string
  activeAddress?: string
  addresses: Array<string>
  disabled: boolean
  onboarded: boolean
  pushSubscription: any

  roles: string[]
  since?: number
  tracks: string[]
  tags: string[]

  favorite_speakers: string[]
  interested_sessions: string[]
  attending_sessions: string[]

  publicSchedule?: boolean
  notifications?: boolean
  createdAt: Date
  updatedAt: Date

  // No longer used?
  speakers: Array<string>
  sessions: Array<{
    id: string
    level: 'interested' | 'attending'
    start: Date
    end: Date
  }>
}
