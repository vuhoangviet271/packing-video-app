export interface DashboardStats {
  ordersPackedToday: number;
  productBreakdown: ProductBreakdownItem[];
}

export interface ProductBreakdownItem {
  productName: string;
  sku: string;
  totalQty: number;
}
