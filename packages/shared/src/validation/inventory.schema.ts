import { z } from 'zod';
import { RETURN_QUALITY } from '../constants';

export const packingCompleteSchema = z.object({
  videoRecordId: z.string().min(1),
  shippingCode: z.string().min(1),
});

export const returnCompleteSchema = z.object({
  videoRecordId: z.string().min(1),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().min(1),
      quality: z.enum([RETURN_QUALITY.GOOD, RETURN_QUALITY.BAD]),
    })
  ),
});

export const manualAdjustSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int(),
  note: z.string().optional(),
});
