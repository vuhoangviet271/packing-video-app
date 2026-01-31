import type { ProductWithComponents } from './product';

export interface Order {
  id: string;
  shippingCode: string;
  source: string;
  createdAt: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  product?: ProductWithComponents;
}

/** Order item after expanding combos into individual products */
export interface ExpandedOrderItem {
  productId: string;
  productName: string;
  sku: string;
  barcode: string | null;
  requiredQty: number;
  parentComboName?: string;
  isComboComponent: boolean;
}
