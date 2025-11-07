'use client';

/**
 * Global Store (Zustand)
 *
 * ARCHITECTURE UPDATE:
 * - Server data (userData, tickets) is now managed by SWR (see src/hooks/useServerData.ts)
 * - This store is kept mainly for backward compatibility and static data (events)
 * - New code should use SWR hooks directly for better caching and performance
 *
 * Migration Status:
 * ✅ userData → useSWR (useUserData hook)
 * ✅ tickets → useSWR (useTickets hook)
 * ✅ favorites → useSWR with mutations (useFavorites hook)
 * 🔄 events → Still in Zustand (static initialization data)
 */

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
  eventId: number | undefined;
  event: any | undefined;
  orderCode: string;
  orderDate: string;
  email: string;
  tickets: Ticket[];
}

export interface AppState {
  // Static data (passed at initialization)
  events: any[] | undefined;

  // Server data (now managed by SWR, kept here for backward compatibility)
  // @deprecated Use SWR hooks instead: useUserData(), useTickets(), useFavorites()
  userData: {
    additional_ticket_emails?: string[];
    favorite_events?: string[];
    email?: string;
  } | null;
  tickets: Order[] | null;
  sideTickets: Order[] | null;
  ticketsLoading: boolean;
  qrCodes: { [key: string]: string };
  announcements: any[];

  // Actions (mostly for backward compatibility)
  // @deprecated Use SWR hooks for automatic caching and revalidation
  setUserData: (userData: AppState['userData']) => void;
  setFavoriteEvents: (nextFavoriteEvents: string[]) => void;
  setTickets: (tickets: Order[] | null) => void;
  setSideTickets: (sideTickets: Order[] | null) => void;
  setTicketsLoading: (loading: boolean) => void;
  setQrCodes: (qrCodes: { [key: string]: string }) => void;
  logout: () => void;
}

export type AppStore = ReturnType<typeof createGlobalStore>;

export const initGlobalStore = (
  events?: any[],
  announcements?: any[],
  userData?: AppState['userData']
): Omit<
  AppState,
  | 'setUserData'
  | 'setFavoriteEvents'
  | 'setTickets'
  | 'setSideTickets'
  | 'setTicketsLoading'
  | 'setQrCodes'
  | 'logout'
> => ({
  events: events,
  announcements: announcements || [],
  userData: userData || null,
  tickets: null,
  sideTickets: null,
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
    | 'setSideTickets'
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

    setSideTickets: (sideTickets: Order[] | null) =>
      set((state) => ({
        ...state,
        sideTickets,
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

    logout: () =>
      set((state) => ({
        ...state,
        userData: null,
        tickets: null,
        ticketsLoading: false,
        qrCodes: {},
      })),
  });

  if (typeof window !== 'undefined') {
    // Client-side: use persist middleware
    return createStore<AppState>()(
      persist(storeConfig, {
        name: 'devconnect-store',
        partialize: (state) => ({
          userData: state.userData,
          tickets: state.tickets,
          sideTickets: state.sideTickets,
          ticketsLoading: state.ticketsLoading,
          qrCodes: state.qrCodes,
        }),
      }) as StateCreator<AppState>
    );
  } else {
    // Server-side: no persist wrapper
    return createStore<AppState>()(storeConfig);
  }
};
