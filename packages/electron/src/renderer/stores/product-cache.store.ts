import { create } from 'zustand';
import { productApi } from '../services/api';
import type { Product } from '@packing/shared';

interface ProductCacheStore {
  products: Product[];
  barcodeMap: Map<string, Product>;
  loaded: boolean;
  loading: boolean;
  loadProducts: () => Promise<void>;
  getByBarcode: (barcode: string) => Product | null;
}

export const useProductCacheStore = create<ProductCacheStore>((set, get) => ({
  products: [],
  barcodeMap: new Map(),
  loaded: false,
  loading: false,

  loadProducts: async () => {
    if (get().loading) return;
    set({ loading: true });

    try {
      // Load all products (large limit to get everything)
      const res = await productApi.list({ limit: 10000 });
      const products: Product[] = res.data.data || [];
      const barcodeMap = new Map<string, Product>();

      for (const p of products) {
        // Map main barcode
        if (p.barcode) {
          barcodeMap.set(p.barcode, p);
        }
        // Map additional barcodes
        if (p.additionalBarcodes) {
          for (const ab of p.additionalBarcodes) {
            barcodeMap.set(ab.barcode, p);
          }
        }
      }

      set({ products, barcodeMap, loaded: true, loading: false });
    } catch (err) {
      console.error('Failed to load product cache:', err);
      set({ loading: false });
    }
  },

  getByBarcode: (barcode: string) => {
    return get().barcodeMap.get(barcode) || null;
  },
}));
