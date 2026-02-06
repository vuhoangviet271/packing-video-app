import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  demoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      demoMode: false,
      setDemoMode: (enabled) => set({ demoMode: enabled }),
    }),
    {
      name: 'settings-storage',
    }
  )
);
