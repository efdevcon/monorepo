'use client';

import { createStore, StateCreator } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Ticket {
  secret: string;
  attendeeName: string | null;
  attendeeEmail: string;
  price: string;
  itemName: string;
  addons: any[];
}

export interface Order {
  orderCode: string;
  orderDate: string;
  email: string;
  tickets: Ticket[];
}

export interface AppState {
  // User data from supabase (so basically data attached to the logged in email)
  userData: {
    additional_ticket_emails?: string[];
    favorite_events?: string[];
    email?: string;
  } | null;
  events: any[] | undefined;
  tickets: Order[] | null;
  ticketsLoading: boolean;
  qrCodes: { [key: string]: string };
  setUserData: (userData: AppState['userData']) => void;
  setFavoriteEvents: (nextFavoriteEvents: string[]) => void;
  setTickets: (tickets: Order[] | null) => void;
  setTicketsLoading: (loading: boolean) => void;
  setQrCodes: (qrCodes: { [key: string]: string }) => void;
  logout: (state: AppState) => void;
}

export type AppStore = ReturnType<typeof createGlobalStore>;

export const initGlobalStore = (
  events?: any[],
  userData?: AppState['userData']
): Omit<
  AppState,
  | 'setUserData'
  | 'setFavoriteEvents'
  | 'setTickets'
  | 'setTicketsLoading'
  | 'setQrCodes'
  | 'logout'
> => ({
  events: events,
  userData: userData || null,
  tickets: null,
  ticketsLoading: false,
  qrCodes: {},
});

export const createGlobalStore = (
  initState: Omit<
    AppState,
    | 'setUserData'
    | 'setFavoriteEvents'
    | 'setTickets'
    | 'setTicketsLoading'
    | 'setQrCodes'
    | 'logout'
  > = initGlobalStore()
) => {
  const storeConfig: StateCreator<AppState> = (set) => ({
    ...initState,

    // User actions
    setUserData: (userData: AppState['userData']) =>
      set((state) => ({
        ...state,
        userData: userData,
      })),

    setFavoriteEvents: (nextFavoriteEvents: string[]) =>
      set((state) => {
        return {
          ...state,
          userData: {
            ...state.userData,
            favorite_events: nextFavoriteEvents,
          },
        };
      }),

    setTickets: (tickets: Order[] | null) =>
      set((state) => ({
        ...state,
        tickets,
      })),

    setTicketsLoading: (loading: boolean) =>
      set((state) => ({
        ...state,
        ticketsLoading: loading,
      })),

    setQrCodes: (qrCodes: { [key: string]: string }) =>
      set((state) => ({
        ...state,
        qrCodes,
      })),

    logout: (state: AppState) =>
      set({
        ...state,
        userData: null,
        tickets: null,
        qrCodes: {},
      }),
  });

  if (typeof window !== 'undefined') {
    // Client-side: use persist middleware
    return createStore<AppState>()(
      persist(storeConfig, {
        name: 'devconnect-store',
        partialize: (state) => ({
          userData: state.userData,
          tickets: state.tickets,
          qrCodes: state.qrCodes,
        }),
      }) as StateCreator<AppState>
    );
  } else {
    // Server-side: no persist wrapper
    return createStore<AppState>()(storeConfig);
  }
};
