'use client';

import {
  type ReactNode,
  createContext,
  useRef,
  useContext,
  useEffect,
  createRef,
} from 'react';
import { useStore } from 'zustand';
// Context no longer needed here - wallet state managed by WalletProvider
// import { useWallet } from '@/context/WalletContext';

import {
  type AppState,
  type AppStore,
  createGlobalStore,
  initGlobalStore,
} from '@/app/store';
// import { ensureUserData } from './store.hooks';

export const GlobalStoreContext = createContext<AppStore | undefined>(
  undefined
);

export interface GlobalStoreProviderProps {
  children: ReactNode;
  events: AppState['events'];
  announcements?: AppState['announcements'];
  userData?: AppState['userData'];
}

// AuthProvider removed - authentication is now handled by WalletProvider
// which runs at the correct level in the provider hierarchy
// const AuthProvider = ({ children }: { children: ReactNode }) => {
//   useWallet();
//   useEffect(() => {
//     console.log('AuthProvider mounted');
//   }, []);
//   return children;
// };

let globalStoreProvider: AppStore | null = null;

export const GlobalStoreProvider = ({
  events,
  announcements,
  userData,
  children,
}: GlobalStoreProviderProps) => {
  if (globalStoreProvider === null) {
    globalStoreProvider = createGlobalStore(
      initGlobalStore(events, announcements, userData)
    );
  }

  return (
    <GlobalStoreContext.Provider value={globalStoreProvider}>
      {children}
    </GlobalStoreContext.Provider>
  );
};

export const useGlobalStore = <T,>(selector: (store: AppState) => T): T => {
  const globalStoreContext = useContext(GlobalStoreContext);

  if (!globalStoreContext) {
    throw new Error(`useGlobalStore must be used within GlobalStoreProvider`);
  }

  return useStore(globalStoreContext, selector);
};
