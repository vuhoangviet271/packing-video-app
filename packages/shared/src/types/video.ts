import type { VideoType, VideoStatus, ReturnQuality } from '../constants';

export interface VideoRecord {
  id: string;
  shippingCode: string;
  orderId: string | null;
  staffId: string;
  type: VideoType;
  status: VideoStatus;
  duration: number;
  fileName: string;
  machineName: string;
  createdAt: string;
  staff?: { id: string; fullName: string };
  scannedItems?: ScannedItem[];
}

export interface ScannedItem {
  id: string;
  videoRecordId: string;
  productId: string;
  scannedQty: number;
  returnQuality: ReturnQuality | null;
  scannedAt: string;
  product?: { id: string; name: string; sku: string };
}

export interface CreateVideoInput {
  shippingCode: string;
  orderId?: string;
  staffId: string;
  type: VideoType;
  status: VideoStatus;
  duration: number;
  fileName: string;
  machineName: string;
  scannedItems?: {
    productId: string;
    scannedQty: number;
    returnQuality?: ReturnQuality;
  }[];
}

export interface VideoListQuery {
  type?: VideoType;
  status?: VideoStatus;
  staffId?: string;
  from?: string;
  to?: string;
  shippingCode?: string;
  page?: number;
  limit?: number;
}

export interface VideoListResponse {
  data: VideoRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
