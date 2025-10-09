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

  return children;
};

export const GlobalStoreProvider = ({
  events,
  userData,
  children,
}: GlobalStoreProviderProps) => {
  // useWalletManager();
  const storeRef = useRef<AppStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createGlobalStore(initGlobalStore(events, userData));
  }

  // useEffect(() => {
  //   if (!storeRef.current) return;

  //   if (email) {
  //     ensureUserData(storeRef.current?.getState().setUserData);
  //   } else {
  //     storeRef.current?.getState().setUserData(null);
  //   }
  // }, [email]);

  return (
    <GlobalStoreContext.Provider value={storeRef.current}>
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
