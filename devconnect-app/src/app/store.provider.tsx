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
import { useWalletManager } from '@/hooks/useWalletManager';

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
  userData?: AppState['userData'];
}

const AuthProvider = ({ children }: { children: ReactNode }) => {
  useWalletManager();

  useEffect(() => {
    console.log('AuthProvider mounted');
  }, []);

  return children;
};

let globalStoreProvider: AppStore | null = null;

export const GlobalStoreProvider = ({
  events,
  userData,
  children,
}: GlobalStoreProviderProps) => {
  if (globalStoreProvider === null) {
    globalStoreProvider = createGlobalStore(initGlobalStore(events, userData));
  }

  return (
    <GlobalStoreContext.Provider value={globalStoreProvider}>
      <AuthProvider>{children}</AuthProvider>
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
