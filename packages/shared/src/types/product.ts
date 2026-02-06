export interface ProductBarcode {
  id: string;
  productId: string;
  barcode: string;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  imageUrl: string | null;
  isCombo: boolean;
  quantity: number;
  unsellableQty: number;
  createdAt: string;
  updatedAt: string;
  additionalBarcodes?: ProductBarcode[];
}

export interface ComboComponent {
  id: string;
  comboId: string;
  componentId: string;
  quantity: number;
  component?: Product;
}

export interface ProductWithComponents extends Product {
  comboComponents?: ComboComponent[];
}

export interface CreateProductInput {
  sku: string;
  barcode?: string;
  name: string;
  imageUrl?: string;
  quantity?: number;
}

export interface CreateComboInput {
  sku: string;
  barcode?: string;
  name: string;
  imageUrl?: string;
  components: { componentId: string; quantity: number }[];
}
