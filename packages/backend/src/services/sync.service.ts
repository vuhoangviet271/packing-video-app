import type { FastifyInstance } from 'fastify';

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

export async function syncKiotVietOrders(app: FastifyInstance): Promise<{ imported: number; skipped: number; total: number }> {
  const retailer = process.env.KIOTVIET_RETAILER || 'spotless';
  const token = await getKiotVietToken();

  const baseUrl =
    'https://public.kiotapi.com/invoices?SaleChannel=true&pageSize=200&orderDirection=Desc&includeInvoiceDelivery=true';
  const MAX_ITEMS = 1000; // Lấy tối đa 1000 đơn (5 pages × 200)
  let currentItem = 0;
  const invoices: any[] = [];

  while (currentItem < MAX_ITEMS) {
    const url = `${baseUrl}&currentItem=${currentItem}`;
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

    const json = (await res.json()) as { total: number; data: any[] };
    const pageInvoices = json.data || [];
    invoices.push(...pageInvoices);

    app.log.debug(`KiotViet sync: Fetched page at offset ${currentItem}, got ${pageInvoices.length} invoices (total: ${json.total})`);

    // Dừng nếu đã lấy hết hoặc page trả về ít hơn 200
    if (pageInvoices.length < 200 || invoices.length >= json.total) {
      break;
    }

    currentItem += 200;
  }

  let imported = 0;
  let skipped = 0;

  let errors = 0;

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

    try {
      // API trả camelCase: invoiceDetails[].productCode, quantity
      const details: any[] = invoice.invoiceDetails || [];

      // Gộp các dòng trùng SKU (cộng dồn quantity) để tránh vi phạm unique constraint
      const mergedMap = new Map<string, number>();
      for (const d of details) {
        const sku = d.productCode as string;
        const qty = (d.quantity || 1) as number;
        mergedMap.set(sku, (mergedMap.get(sku) || 0) + qty);
      }
      const items = Array.from(mergedMap.entries()).map(([sku, quantity]) => ({ sku, quantity }));

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
    } catch (err: any) {
      errors++;
      app.log.error('KiotViet sync: Failed to import order ' + shippingCode + ': ' + (err.message || err));
    }
  }

  app.log.info(`KiotViet sync done: ${imported} imported, ${skipped} skipped, ${errors} errors, ${invoices.length} total`);
  return { imported, skipped, total: invoices.length };
}
