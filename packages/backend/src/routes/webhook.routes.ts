import type { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'crypto';

function verifyKiotVietSignature(body: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(body);
  const computed = hmac.digest('hex');
  return computed === signature;
}

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  // Cần raw body để verify signature → thêm content type parser
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    (req, body, done) => {
      try {
        // Lưu raw body để verify signature
        (req as any).rawBody = body;
        done(null, JSON.parse(body as string));
      } catch (err: any) {
        done(err);
      }
    },
  );

  app.post('/kiotviet', async (request, reply) => {
    const webhookSecret = process.env.KIOTVIET_WEBHOOK_SECRET;

    // Verify signature nếu có cấu hình secret
    if (webhookSecret) {
      const signature = request.headers['x-hub-signature'] as string;
      const rawBody = (request as any).rawBody as string;

      if (!signature || !rawBody) {
        app.log.warn('Webhook missing signature or body');
        return reply.status(401).send({ error: 'Missing signature' });
      }

      if (!verifyKiotVietSignature(rawBody, signature, webhookSecret)) {
        app.log.warn('Webhook signature mismatch');
        return reply.status(401).send({ error: 'Invalid signature' });
      }
    }

    const payload = request.body as any;

    try {
      const notifications = payload.Notifications || [payload];

      for (const notification of notifications) {
        const orderData = notification.Data || notification;
        const shippingCode = orderData.Code || orderData.shippingCode;

        if (!shippingCode) {
          app.log.warn('Webhook received without shipping code');
          continue;
        }

        const existing = await app.prisma.order.findUnique({ where: { shippingCode } });
        if (existing) {
          app.log.info('Order ' + shippingCode + ' already exists, skipping');
          continue;
        }

        const orderDetails = orderData.OrderDetails || orderData.items || [];
        const items: { sku: string; quantity: number }[] = orderDetails.map((detail: any) => ({
          sku: detail.ProductCode || detail.sku,
          quantity: detail.Quantity || detail.quantity || 1,
        }));

        const skus = items.map((i) => i.sku);
        const products = await app.prisma.product.findMany({ where: { sku: { in: skus } } });
        const productMap = new Map(products.map((p) => [p.sku, p]));

        await app.prisma.order.create({
          data: {
            shippingCode,
            source: 'kiotviet',
            rawPayload: JSON.stringify(orderData),
            items: {
              create: items
                .filter((i) => productMap.has(i.sku))
                .map((i) => ({ productId: productMap.get(i.sku)!.id, quantity: i.quantity })),
            },
          },
        });

        app.log.info('Order ' + shippingCode + ' created with ' + items.length + ' items');
      }

      return { success: true };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });
};
