import { z } from 'zod';

export const createProductSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  imageUrl: z.string().url().optional(),
  quantity: z.number().int().min(0).default(0),
});

export const createComboSchema = z.object({
  sku: z.string().min(1),
  barcode: z.string().optional(),
  name: z.string().min(1),
  imageUrl: z.string().url().optional(),
  components: z
    .array(
      z.object({
        componentId: z.string().min(1),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});

export const updateProductSchema = z.object({
  sku: z.string().min(1).optional(),
  barcode: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  imageUrl: z.string().url().nullable().optional(),
  quantity: z.number().int().min(0).optional(),
  unsellableQty: z.number().int().min(0).optional(),
});
