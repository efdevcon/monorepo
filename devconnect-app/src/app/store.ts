'use client';

import { create } from 'zustand';

export interface AppState {
  // User data from supabase (so basically data attached to the logged in email)
  userData: {
    additional_ticket_emails?: string[];
    favorite_events?: string[];
  } | null;
  setUserData: (userData: AppState['userData']) => void;
  setFavoriteEvents: (nextFavoriteEvents: string[]) => void;
  logout: (state: AppState) => void;
}

// Lets keep global state for simplicity - useShallow for performance as needed
export const useGlobalStore = create<AppState>()((set) => ({
  // Initial state
  userData: null,

  // User actions
  setUserData: (userData: AppState['userData']) =>
    set((state) => ({
      ...state,
      userData: userData,
    })),

  setFavoriteEvents: (nextFavoriteEvents: string[]) =>
    set((state: AppState) => {
      return {
        ...state,
        userData: {
          ...state.userData,
          favorite_events: nextFavoriteEvents,
        },
      };
    }),

  logout: (state: AppState) =>
    set({
      ...state,
      userData: null,
    }),
}));
