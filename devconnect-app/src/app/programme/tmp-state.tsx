import { create } from 'zustand';
import { Event } from 'lib/components/event-schedule-new/model';

interface CalendarStore {
  selectedEvent: Event | null;
  selectedDay: string | null;
  setSelectedEvent: (event: Event | null) => void;
  setSelectedDay: (day: string | null) => void;
}

export const useCalendarStore = create<CalendarStore>((set: any) => ({
  selectedEvent: null,
  selectedDay: null,
  setSelectedEvent: (event: Event | null) => set({ selectedEvent: event }),
  setSelectedDay: (day: string | null) => set({ selectedDay: day }),
}));

// Ensure the store is properly initialized for SSR
if (typeof window !== 'undefined') {
  // Client-side only: ensure store is initialized
  useCalendarStore.getState();
}
