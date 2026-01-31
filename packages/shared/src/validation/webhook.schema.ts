import { z } from 'zod';

/** KiotViet webhook payload for new orders */
export const kiotvietWebhookSchema = z.object({
  Id: z.number().optional(),
  Notifications: z
    .array(
      z.object({
        Action: z.string(),
        Data: z.array(
          z.object({
            Id: z.number(),
            Code: z.string().optional(),
            OrderDetails: z
              .array(
                z.object({
                  ProductId: z.number(),
                  ProductCode: z.string(),
                  Quantity: z.number(),
                })
              )
              .optional(),
          })
        ),
      })
    )
    .optional(),
});

/** Simplified order data we extract from webhook */
export const webhookOrderSchema = z.object({
  shippingCode: z.string().min(1),
  items: z.array(
    z.object({
      sku: z.string().min(1),
      quantity: z.number().int().min(1),
    })
  ),
});
