'use client';

import { type ReactNode, createContext, useRef, useContext } from 'react';
import { useStore } from 'zustand';
import { useWalletManager } from '@/hooks/useWalletManager';

import {
  type AppState,
  type AppStore,
  createGlobalStore,
  initGlobalStore,
} from '@/app/store';

export const GlobalStoreContext = createContext<AppStore | undefined>(
  undefined
);

export interface GlobalStoreProviderProps {
  children: ReactNode;
  events: AppState['events'];
}

const WalletProvider = ({ children }: { children: ReactNode }) => {
  useWalletManager();

  return children;
};

export const GlobalStoreProvider = ({
  events,
  children,
}: GlobalStoreProviderProps) => {
  const storeRef = useRef<AppStore | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createGlobalStore(initGlobalStore(events));
  }

  return (
    <GlobalStoreContext.Provider value={storeRef.current}>
      <WalletProvider>{children}</WalletProvider>
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
