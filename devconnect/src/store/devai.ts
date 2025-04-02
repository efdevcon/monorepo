import { create } from 'zustand'

interface DevaBotStore {
  visible: boolean;
  setVisible: (visible: boolean) => void;
  toggleVisible: () => void;
}

export const useDevaBotStore = create<DevaBotStore>((set) => ({
  visible: false,
  setVisible: (visible: boolean) => set({ visible }),
  toggleVisible: () => set((state) => ({ visible: !state.visible })),
}));

