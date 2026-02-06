import { create } from 'zustand';
import type { RecordingState } from '@packing/shared';
import type { ExpandedOrderItem } from '@packing/shared';

export interface ForeignAlert {
  productName: string;
  sku: string;
  reason: 'foreign' | 'excess';
}

export interface ReturnScanEntry {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  imageUrl: string | null;
  quality: 'GOOD' | 'BAD';
  scannedAt: number;
}

let entryCounter = 0;

interface RecordingStore {
  state: RecordingState;
  currentShippingCode: string;
  duration: number;
  orderItems: ExpandedOrderItem[];
  scanCounts: Record<string, number>; // productId -> scanned count
  returnScanEntries: ReturnScanEntry[];
  foreignAlert: ForeignAlert | null;
  setState: (s: RecordingState) => void;
  setShippingCode: (code: string) => void;
  setDuration: (d: number) => void;
  setOrderItems: (items: ExpandedOrderItem[]) => void;
  incrementScan: (productId: string) => void;
  decrementScan: (productId: string) => void;
  removeScan: (productId: string) => void;
  resetScanCounts: () => void;
  addReturnScanEntry: (entry: Omit<ReturnScanEntry, 'id' | 'scannedAt'>) => void;
  updateReturnEntryQuality: (id: string, quality: 'GOOD' | 'BAD') => void;
  removeReturnScanEntry: (id: string) => void;
  setForeignAlert: (alert: ForeignAlert | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  state: 'IDLE',
  currentShippingCode: '',
  duration: 0,
  orderItems: [],
  scanCounts: {},
  returnScanEntries: [],
  foreignAlert: null,
  setState: (state) => set({ state }),
  setShippingCode: (code) => set({ currentShippingCode: code }),
  setDuration: (d) => set({ duration: d }),
  setOrderItems: (items) => set({ orderItems: items }),
  incrementScan: (productId) =>
    set((s) => ({
      scanCounts: { ...s.scanCounts, [productId]: (s.scanCounts[productId] || 0) + 1 },
    })),
  decrementScan: (productId) =>
    set((s) => {
      const current = s.scanCounts[productId] || 0;
      if (current <= 1) {
        // Remove the key entirely if count goes to 0
        const { [productId]: _, ...rest } = s.scanCounts;
        return { scanCounts: rest };
      }
      return { scanCounts: { ...s.scanCounts, [productId]: current - 1 } };
    }),
  removeScan: (productId) =>
    set((s) => {
      const { [productId]: _, ...rest } = s.scanCounts;
      return { scanCounts: rest };
    }),
  resetScanCounts: () => set({ scanCounts: {} }),
  addReturnScanEntry: (entry) =>
    set((s) => ({
      returnScanEntries: [
        ...s.returnScanEntries,
        { ...entry, id: `scan-${++entryCounter}-${Date.now()}`, scannedAt: Date.now() },
      ],
    })),
  updateReturnEntryQuality: (id, quality) =>
    set((s) => ({
      returnScanEntries: s.returnScanEntries.map((e) =>
        e.id === id ? { ...e, quality } : e
      ),
    })),
  removeReturnScanEntry: (id) =>
    set((s) => ({
      returnScanEntries: s.returnScanEntries.filter((e) => e.id !== id),
    })),
  setForeignAlert: (alert) => set({ foreignAlert: alert }),
  reset: () =>
    set({
      state: 'IDLE',
      currentShippingCode: '',
      duration: 0,
      orderItems: [],
      scanCounts: {},
      returnScanEntries: [],
      foreignAlert: null,
    }),
}));
