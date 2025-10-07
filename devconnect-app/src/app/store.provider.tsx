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

export const GlobalStoreContext = createContext<AppStore | undefined>(
  undefined
);

export interface GlobalStoreProviderProps {
  children: ReactNode;
  events: AppState['events'];
  userData: AppState['userData'];
}

const WalletProvider = ({ children }: { children: ReactNode }) => {
  useWalletManager();

  return children;
};

// const storeRef = createRef<AppStore | null>();

export const GlobalStoreProvider = ({
  events,
  userData,
  children,
}: GlobalStoreProviderProps) => {
  const storeRef = useRef<AppStore | null>(null);

  if (storeRef.current === null) {
    storeRef.current = createGlobalStore(initGlobalStore(events, userData));
  }

  useStore(storeRef.current, (state) => console.log('STATE', state));

  useEffect(() => {
    console.log('MOUNTED THE PROVIDER, SHOULD RUN JUST ONCE');
  }, []);

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
