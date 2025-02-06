import { create } from 'zustand'

interface DevaBotState {
  visible: boolean
  setVisible: (visible: boolean) => void
  
  query: string
  setQuery: (query: string) => void
  
  executingQuery: boolean
  setExecutingQuery: (executing: boolean) => void
  
  error: string
  setError: (error: string) => void
  
  threadID: string
  setThreadID: (threadID: string) => void
  
  messages: any[]
  setMessages: (messages: any[]) => void
  
  reset: () => void
}

export const useDevaBotStore = create<DevaBotState>((set) => ({
  visible: false,
  setVisible: (visible) => set({ visible }),

  query: '',
  setQuery: (query) => set({ query }),

  executingQuery: false, 
  setExecutingQuery: (executingQuery) => set({ executingQuery }),

  error: '',
  setError: (error) => set({ error }),

  threadID: '',
  setThreadID: (threadID) => set({ threadID }),

  messages: [],
  setMessages: (messages) => set({ messages }),

  reset: () => set({
    threadID: '',
    messages: [],
    error: '',
    executingQuery: false,
    query: ''
  })
}))
