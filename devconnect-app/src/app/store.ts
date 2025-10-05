'use client';

import { createStore } from 'zustand';

export interface AppState {
  // User data from supabase (so basically data attached to the logged in email)
  userData: {
    additional_ticket_emails?: string[];
    favorite_events?: string[];
    email?: string;
  } | null;
  events: any[] | undefined;
  setUserData: (userData: AppState['userData']) => void;
  setFavoriteEvents: (nextFavoriteEvents: string[]) => void;
  logout: (state: AppState) => void;
}

export type AppStore = ReturnType<typeof createGlobalStore>;

export const initGlobalStore = (
  events?: any[]
): Omit<AppState, 'setUserData' | 'setFavoriteEvents' | 'logout'> => ({
  events: events,
  userData: null,
});

export const createGlobalStore = (
  initState: Omit<
    AppState,
    'setUserData' | 'setFavoriteEvents' | 'logout'
  > = initGlobalStore()
) => {
  return createStore<AppState>()((set) => ({
    ...initState,

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
};
