import { z } from 'zod';
import { VIDEO_TYPE, VIDEO_STATUS, RETURN_QUALITY } from '../constants';

export const createVideoSchema = z.object({
  shippingCode: z.string().min(1),
  orderId: z.string().optional(),
  staffId: z.string().min(1),
  type: z.enum([VIDEO_TYPE.PACKING, VIDEO_TYPE.RETURN]),
  status: z.enum([VIDEO_STATUS.COMPLETED, VIDEO_STATUS.FAILED]),
  duration: z.number().int().min(0),
  fileName: z.string().min(1),
  machineName: z.string().min(1),
  scannedItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        scannedQty: z.number().int().min(1),
        returnQuality: z.enum([RETURN_QUALITY.GOOD, RETURN_QUALITY.BAD]).optional(),
      })
    )
    .optional(),
});

export const videoListQuerySchema = z.object({
  type: z.enum([VIDEO_TYPE.PACKING, VIDEO_TYPE.RETURN]).optional(),
  status: z.enum([VIDEO_STATUS.COMPLETED, VIDEO_STATUS.FAILED]).optional(),
  staffId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  shippingCode: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});
