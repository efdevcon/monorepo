import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  user: any;
}

const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        user: {},
        // User actions
        setUser: (userData: any) =>
          set((state) => ({
            user: userData,
          })),

        logout: () =>
          set({
            user: null,
          }),
      }),
      {
        name: 'devconnect-app-store',
        partialize: (state) => ({
          user: state.user,
        }),
      }
    )
  )
);

export default useAppStore;
