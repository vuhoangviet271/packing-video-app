export const VIDEO_TYPE = {
  PACKING: 'PACKING',
  RETURN: 'RETURN',
} as const;

export type VideoType = (typeof VIDEO_TYPE)[keyof typeof VIDEO_TYPE];

export const VIDEO_STATUS = {
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type VideoStatus = (typeof VIDEO_STATUS)[keyof typeof VIDEO_STATUS];

export const RETURN_QUALITY = {
  GOOD: 'GOOD',
  BAD: 'BAD',
} as const;

export type ReturnQuality = (typeof RETURN_QUALITY)[keyof typeof RETURN_QUALITY];

export const INVENTORY_ACTION = {
  PACKING_DEDUCT: 'PACKING_DEDUCT',
  RETURN_GOOD: 'RETURN_GOOD',
  RETURN_BAD: 'RETURN_BAD',
  MANUAL_ADJUST: 'MANUAL_ADJUST',
} as const;

export type InventoryAction = (typeof INVENTORY_ACTION)[keyof typeof INVENTORY_ACTION];

export const SCAN_STATUS = {
  COMPLETE: 'COMPLETE',
  PARTIAL: 'PARTIAL',
  NOT_SCANNED: 'NOT_SCANNED',
  FOREIGN: 'FOREIGN',
} as const;

export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

export const RECORDING_STATE = {
  IDLE: 'IDLE',
  RECORDING: 'RECORDING',
  SAVING: 'SAVING',
  CHECK_DUPLICATE: 'CHECK_DUPLICATE',
} as const;

export type RecordingState = (typeof RECORDING_STATE)[keyof typeof RECORDING_STATE];
