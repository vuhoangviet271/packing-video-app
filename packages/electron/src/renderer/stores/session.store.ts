import { create } from 'zustand';

export interface SessionEntry {
  stt: number;
  shippingCode: string;
  status: 'completed' | 'failed';
  duration: number;
  type: 'PACKING' | 'RETURN';
  time: string;
}

interface SessionStore {
  entries: SessionEntry[];
  addEntry: (entry: Omit<SessionEntry, 'stt'>) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  entries: [],
  addEntry: (entry) =>
    set((s) => ({
      entries: [...s.entries, { ...entry, stt: s.entries.length + 1 }],
    })),
  clear: () => set({ entries: [] }),
}));
