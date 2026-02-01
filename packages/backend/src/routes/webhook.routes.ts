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

  app.post('/kiotviet', async (request) => {
    const webhookSecret = process.env.KIOTVIET_WEBHOOK_SECRET;

    // Verify signature nếu có cấu hình secret
    // QUAN TRỌNG: Luôn trả 200 cho KiotViet, nếu trả 4xx thì KiotViet sẽ disable webhook
    if (webhookSecret) {
      const signature = request.headers['x-hub-signature'] as string;
      const rawBody = (request as any).rawBody as string;

      if (!signature || !rawBody) {
        app.log.warn('Webhook missing signature or body');
        return { success: false, reason: 'missing_signature' };
      }

      if (!verifyKiotVietSignature(rawBody, signature, webhookSecret!)) {
        app.log.warn('Webhook signature mismatch');
        return { success: false, reason: 'invalid_signature' };
      }
    }

    const payload = request.body as any;

    // Log raw payload để debug
    app.log.info('Webhook raw payload: ' + JSON.stringify(payload));

    try {
      // KiotViet gửi: { Notifications: [{ Action: "invoice.update", Data: [...] }] }
      const notifications = payload.Notifications || [payload];

      for (const notification of notifications) {
        const dataItems = notification.Data || [notification];
        const orderList = Array.isArray(dataItems) ? dataItems : [dataItems];

        for (const orderData of orderList) {
          // Chỉ xử lý đơn có InvoiceDelivery.Status = 1
          const deliveryStatus = orderData.InvoiceDelivery?.Status;
          if (deliveryStatus !== 1) {
            app.log.info('Webhook: bỏ qua đơn có DeliveryStatus=' + deliveryStatus + ', Code=' + (orderData.Code || 'unknown'));
            continue;
          }

          // KiotViet dùng PascalCase: InvoiceDelivery.DeliveryCode
          const shippingCode = orderData.InvoiceDelivery?.DeliveryCode;

          if (!shippingCode) {
            app.log.warn('Webhook: đơn không có mã vận đơn (DeliveryCode), Code=' + (orderData.Code || 'unknown'));
            continue;
          }

          const existing = await app.prisma.order.findUnique({ where: { shippingCode } });
          if (existing) {
            app.log.info('Order ' + shippingCode + ' already exists, skipping');
            continue;
          }

          // KiotViet PascalCase: InvoiceDetails[].ProductCode + Quantity
          const invoiceDetails = orderData.InvoiceDetails || [];
          const items: { sku: string; quantity: number; productName: string }[] = invoiceDetails.map((detail: any) => ({
            sku: detail.ProductCode,
            quantity: detail.Quantity || 1,
            productName: detail.ProductName || '',
          }));

          const skus = items.map((i) => i.sku);
          const products = await app.prisma.product.findMany({ where: { sku: { in: skus } } });
          const productMap = new Map(products.map((p) => [p.sku, p]));

          // Log sản phẩm không khớp
          const unmatchedSkus = skus.filter((s) => !productMap.has(s));
          if (unmatchedSkus.length > 0) {
            app.log.warn('Webhook: SKU không tìm thấy trong DB: ' + unmatchedSkus.join(', '));
          }

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

          const matched = items.length - unmatchedSkus.length;
          app.log.info('Order ' + shippingCode + ' created: ' + matched + '/' + items.length + ' products matched');
        }
      }

      return { success: true };
    } catch (error) {
      app.log.error(error);
      // Luôn trả 200, không trả 5xx để KiotViet không disable webhook
      return { success: false, reason: 'processing_error' };
    }
  });
};
