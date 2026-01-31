import { create } from 'zustand';
import type { RecordingState } from '@packing/shared';
import type { ExpandedOrderItem } from '@packing/shared';

interface RecordingStore {
  state: RecordingState;
  currentShippingCode: string;
  duration: number;
  orderItems: ExpandedOrderItem[];
  scanCounts: Record<string, number>; // productId -> scanned count
  setState: (s: RecordingState) => void;
  setShippingCode: (code: string) => void;
  setDuration: (d: number) => void;
  setOrderItems: (items: ExpandedOrderItem[]) => void;
  incrementScan: (productId: string) => void;
  resetScanCounts: () => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  state: 'IDLE',
  currentShippingCode: '',
  duration: 0,
  orderItems: [],
  scanCounts: {},
  setState: (state) => set({ state }),
  setShippingCode: (code) => set({ currentShippingCode: code }),
  setDuration: (d) => set({ duration: d }),
  setOrderItems: (items) => set({ orderItems: items }),
  incrementScan: (productId) =>
    set((s) => ({
      scanCounts: { ...s.scanCounts, [productId]: (s.scanCounts[productId] || 0) + 1 },
    })),
  resetScanCounts: () => set({ scanCounts: {} }),
  reset: () =>
    set({
      state: 'IDLE',
      currentShippingCode: '',
      duration: 0,
      orderItems: [],
      scanCounts: {},
    }),
}));
