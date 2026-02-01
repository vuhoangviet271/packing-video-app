import type { FastifyPluginAsync } from 'fastify';

// Cache token trong memory
let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getKiotVietToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const clientId = process.env.KIOTVIET_CLIENT_ID;
  const clientSecret = process.env.KIOTVIET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing KIOTVIET_CLIENT_ID or KIOTVIET_CLIENT_SECRET');
  }

  const res = await fetch('https://id.kiotviet.vn/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept-Encoding': 'identity' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scopes: 'PublicApi.Access',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('KiotViet token failed: ' + res.status + ' ' + text);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = data.access_token;
  // Trừ 60s buffer để tránh dùng token sắp hết hạn
  tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken;
}

export const kiotvietRoutes: FastifyPluginAsync = async (app) => {
  app.post('/sync', { preHandler: [app.authenticate] }, async () => {
    const retailer = process.env.KIOTVIET_RETAILER || 'spotless';
    const token = await getKiotVietToken();

    const url =
      'https://public.kiotapi.com/invoices?SaleChannel=true&pageSize=200&includePayment=true&orderDirection=Desc&includeInvoiceDelivery=true';

    const res = await fetch(url, {
      headers: {
        Retailer: retailer,
        Authorization: 'Bearer ' + token,
        'Accept-Encoding': 'identity',
      },
    });

    if (!res.ok) {
      const text = await res.text();
      app.log.error('KiotViet API failed: ' + res.status + ' ' + text);
      throw new Error('KiotViet API failed: ' + res.status);
    }

    const json = (await res.json()) as { data: any[] };
    const invoices: any[] = json.data || [];

    let imported = 0;
    let skipped = 0;

    for (const invoice of invoices) {
      // API trả camelCase: invoiceDelivery.status
      const delivery = invoice.invoiceDelivery;
      if (!delivery || delivery.status !== 1) continue;

      const shippingCode = delivery.deliveryCode;
      if (!shippingCode) continue;

      // Skip nếu đã tồn tại
      const existing = await app.prisma.order.findUnique({ where: { shippingCode } });
      if (existing) {
        skipped++;
        continue;
      }

      // API trả camelCase: invoiceDetails[].productCode, quantity
      const details: any[] = invoice.invoiceDetails || [];
      const items = details.map((d: any) => ({
        sku: d.productCode as string,
        quantity: (d.quantity || 1) as number,
      }));

      const skus = items.map((i) => i.sku);
      const products = await app.prisma.product.findMany({ where: { sku: { in: skus } } });
      const productMap = new Map(products.map((p) => [p.sku, p]));

      const unmatchedSkus = skus.filter((s) => !productMap.has(s));
      if (unmatchedSkus.length > 0) {
        app.log.warn('KiotViet sync: SKU không tìm thấy: ' + unmatchedSkus.join(', '));
      }

      await app.prisma.order.create({
        data: {
          shippingCode,
          source: 'kiotviet-api',
          rawPayload: JSON.stringify(invoice),
          items: {
            create: items
              .filter((i) => productMap.has(i.sku))
              .map((i) => ({ productId: productMap.get(i.sku)!.id, quantity: i.quantity })),
          },
        },
      });

      imported++;
      app.log.info('KiotViet sync: Order ' + shippingCode + ' imported');
    }

    app.log.info(`KiotViet sync done: ${imported} imported, ${skipped} skipped, ${invoices.length} total`);
    return { imported, skipped, total: invoices.length };
  });
};
