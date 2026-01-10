import React from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Session as SessionType } from 'types/Session'
import { Speaker as SpeakerType } from 'types/Speaker'
import router from 'next/router'

// Filter state types
export const initialFilterState = {
  text: '',
  attending: false,
  favorited: false,
  type: {} as Record<string, boolean>,
  track: {} as Record<string, boolean>,
  expertise: {} as Record<string, boolean>,
  day: {} as Record<string, boolean>,
  room: {} as Record<string, boolean>,
  cls: {} as Record<string, boolean>,
  other: {} as Record<string, boolean>,
}

export const initialSpeakerFilterState = {
  ...initialFilterState,
  letter: '',
}

export type FilterState = typeof initialFilterState
export type SpeakerFilterState = typeof initialSpeakerFilterState
export type EventTab = 'venue' | 'information' | 'contact' | 'directions'

// App store state
interface AppState {
  // Event tab
  selectedEventTab: EventTab
  setSelectedEventTab: (tab: EventTab) => void

  // Session state
  selectedSession: SessionType | null
  setSelectedSession: (session: SessionType | null) => void
  sessionTimelineView: boolean
  setSessionTimelineView: (view: boolean) => void
  sessionFilterOpen: boolean
  setSessionFilterOpen: (open: boolean) => void
  sessionFilter: FilterState
  setSessionFilter: (filter: FilterState | ((prev: FilterState) => FilterState)) => void

  // Speaker state
  selectedSpeaker: SpeakerType | null
  setSelectedSpeaker: (speaker: SpeakerType | null) => void
  speakerFilterOpen: boolean
  setSpeakerFilterOpen: (open: boolean) => void
  speakerFilter: SpeakerFilterState
  setSpeakerFilter: (filter: SpeakerFilterState | ((prev: SpeakerFilterState) => SpeakerFilterState)) => void

  // Data atoms
  sessions: SessionType[] | null
  setSessions: (sessions: SessionType[] | null) => void
  speakers: SpeakerType[] | null
  setSpeakers: (speakers: SpeakerType[] | null) => void
  rooms: any[] | null
  setRooms: (rooms: any[] | null) => void

  // Notifications
  notifications: any[]
  setNotifications: (notifications: any[]) => void
  seenNotifications: Set<string>
  setSeenNotifications: (seen: Set<string> | ((prev: Set<string>) => Set<string>)) => void

  // DevaBot
  devaBotVisible: boolean | string
  setDevaBotVisible: (visible: boolean | string) => void

  // Session ID
  sessionId: string | null
  setSessionId: (id: string | null) => void
}

// Helper to sync session filter with URL
const syncSessionFilterToUrl = (filter: FilterState) => {
  if (typeof window === 'undefined') return

  const searchParams = new URLSearchParams()

  Object.entries(filter).forEach(([key, value]: [string, any]) => {
    // Skip if it's the default value
    if (JSON.stringify(value) === JSON.stringify((initialFilterState as any)[key])) return

    // Handle different value types
    if (typeof value === 'object' && Object.keys(value).length > 0) {
      // For objects (like type, track, expertise), use keys that are true
      const activeKeys = Object.entries(value)
        .filter(([_, isActive]) => isActive)
        .map(([k]) => encodeURIComponent(k))
      if (activeKeys.length) searchParams.set(key, activeKeys.join(','))
    } else if (typeof value === 'boolean' && value) {
      // For boolean flags (like attending, favorited), just include if true
      searchParams.set(key, '1')
    } else if (value) {
      // For simple values (like text, letter), include if non-empty
      searchParams.set(key, encodeURIComponent(value))
    }
  })

  const { pathname } = window.location
  const query = searchParams.toString() ? `${searchParams.toString()}` : ''
  router.replace({ pathname, query }, undefined, { shallow: true })
}

// Create the store with persistence for selected items
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Event tab
      selectedEventTab: 'venue',
      setSelectedEventTab: (tab) => set({ selectedEventTab: tab }),

      // Session state
      selectedSession: null,
      setSelectedSession: (session) => set({ selectedSession: session }),
      sessionTimelineView: false,
      setSessionTimelineView: (view) => set({ sessionTimelineView: view }),
      sessionFilterOpen: false,
      setSessionFilterOpen: (open) => set({ sessionFilterOpen: open }),
      sessionFilter: initialFilterState,
      setSessionFilter: (filterOrUpdater) => {
        const currentFilter = get().sessionFilter
        const newFilter = typeof filterOrUpdater === 'function' 
          ? filterOrUpdater(currentFilter) 
          : filterOrUpdater
        set({ sessionFilter: newFilter })
        syncSessionFilterToUrl(newFilter)
      },

      // Speaker state
      selectedSpeaker: null,
      setSelectedSpeaker: (speaker) => set({ selectedSpeaker: speaker }),
      speakerFilterOpen: false,
      setSpeakerFilterOpen: (open) => set({ speakerFilterOpen: open }),
      speakerFilter: initialSpeakerFilterState,
      setSpeakerFilter: (filterOrUpdater) => {
        const currentFilter = get().speakerFilter
        const newFilter = typeof filterOrUpdater === 'function' 
          ? filterOrUpdater(currentFilter) 
          : filterOrUpdater
        set({ speakerFilter: newFilter })
      },

      // Data atoms
      sessions: null,
      setSessions: (sessions) => set({ sessions }),
      speakers: null,
      setSpeakers: (speakers) => set({ speakers }),
      rooms: null,
      setRooms: (rooms) => set({ rooms }),

      // Notifications
      notifications: [],
      setNotifications: (notifications) => set({ notifications }),
      seenNotifications: new Set(),
      setSeenNotifications: (seenOrUpdater) => {
        const current = get().seenNotifications
        const newSeen = typeof seenOrUpdater === 'function' 
          ? seenOrUpdater(current) 
          : seenOrUpdater
        set({ seenNotifications: newSeen })
      },

      // DevaBot
      devaBotVisible: false,
      setDevaBotVisible: (visible) => set({ devaBotVisible: visible }),

      // Session ID
      sessionId: null,
      setSessionId: (id) => set({ sessionId: id }),
    }),
    {
      name: 'devcon-app-storage',
      partialize: (state) => ({
        selectedSession: state.selectedSession,
        selectedSpeaker: state.selectedSpeaker,
        speakerFilter: state.speakerFilter,
      }),
      // Handle Set serialization for seenNotifications
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          return parsed
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
)

// Selectors (derived state) - these are just functions that compute values
export const useSelectedSpeakerFull = () => {
  const selectedSpeaker = useAppStore((state) => state.selectedSpeaker)
  const speakers = useAppStore((state) => state.speakers)
  
  if (!selectedSpeaker) return null
  return speakers?.find(speaker => speaker.id === selectedSpeaker?.id) || null
}

export const useSelectedSessionFull = () => {
  const selectedSession = useAppStore((state) => state.selectedSession)
  const sessions = useAppStore((state) => state.sessions)
  
  if (!selectedSession) return null
  return sessions?.find(session => session.sourceId === selectedSession?.sourceId) || null
}

export const useNotificationsCount = () => {
  const notifications = useAppStore((state) => state.notifications)
  const seenNotifications = useAppStore((state) => state.seenNotifications)
  
  if (typeof window === 'undefined') return 0

  const storedSeen = JSON.parse(localStorage.getItem('seenNotifications') || '[]')
  const seenSet = new Set([...seenNotifications, ...storedSeen])
  
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  return notifications.filter(notification => {
    const notificationDate = new Date(notification.sendAt)
    return notificationDate >= threeDaysAgo && !seenSet.has(notification.id)
  }).length
}

// Hook for seen notifications functionality
export const useSeenNotifications = () => {
  const notifications = useAppStore((state) => state.notifications)
  const setNotifications = useAppStore((state) => state.setNotifications)
  const seenNotifications = useAppStore((state) => state.seenNotifications)
  const setSeenNotifications = useAppStore((state) => state.setSeenNotifications)
  const notificationsCount = useNotificationsCount()

  // Memoize to prevent infinite loops in useEffect dependencies
  const syncWithLocalStorage = React.useCallback(() => {
    if (typeof window === 'undefined') return
    const storedNotifications = JSON.parse(localStorage.getItem('seenNotifications') || '[]')
    setSeenNotifications(new Set(storedNotifications))
  }, [setSeenNotifications])

  const markAllAsRead = React.useCallback(() => {
    const updated = new Set([...notifications.map(n => n.id)])
    localStorage.setItem('seenNotifications', JSON.stringify(Array.from(updated)))
    setSeenNotifications(updated)
    setNotifications([...notifications])
  }, [notifications, setSeenNotifications, setNotifications])

  return { seenNotifications, markAllAsRead, notificationsCount, syncWithLocalStorage }
}

// Helper to mark all notifications as read (standalone function)
export const markAllNotificationsAsRead = (notifications: any[]) => {
  const notificationIds = notifications.map(notification => notification.id)
  localStorage.setItem('seenNotifications', JSON.stringify(notificationIds))
}
