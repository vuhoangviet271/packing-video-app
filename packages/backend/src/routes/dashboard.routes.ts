import type { FastifyPluginAsync } from 'fastify';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  // Accept optional `from` and `to` query params (YYYY-MM-DD), default to today
  app.get('/today', async (request) => {
    const { from, to } = request.query as { from?: string; to?: string };

    let startDate: Date;
    let endDate: Date;

    if (from) {
      startDate = new Date(from + 'T00:00:00');
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    if (to) {
      endDate = new Date(to + 'T23:59:59.999');
    } else {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const [ordersPackedToday, ordersReturnedToday, allVideos] = await Promise.all([
      app.prisma.videoRecord.count({
        where: { type: 'PACKING', status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
      }),
      app.prisma.videoRecord.count({
        where: { type: 'RETURN', status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
      }),
      app.prisma.videoRecord.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: startDate, lte: endDate } },
        include: { scannedItems: { include: { product: { select: { name: true, sku: true } } } } },
      }),
    ]);

    const videosToday = allVideos.length;
    const avgDuration = videosToday > 0 ? allVideos.reduce((sum, v) => sum + v.duration, 0) / videosToday : 0;

    // Product breakdown: split by packing (exported) and return (good/bad)
    const packingVideos = allVideos.filter((v) => v.type === 'PACKING');
    const returnVideos = allVideos.filter((v) => v.type === 'RETURN');

    const breakdown = new Map<string, {
      productName: string;
      sku: string;
      totalDeducted: number;
      totalReturnedGood: number;
      totalReturnedBad: number;
    }>();

    // Packing: count exported qty
    for (const video of packingVideos) {
      for (const item of video.scannedItems) {
        const existing = breakdown.get(item.productId);
        if (existing) {
          existing.totalDeducted += item.scannedQty;
        } else {
          breakdown.set(item.productId, {
            productName: item.product.name,
            sku: item.product.sku,
            totalDeducted: item.scannedQty,
            totalReturnedGood: 0,
            totalReturnedBad: 0,
          });
        }
      }
    }

    // Return: count good/bad qty
    for (const video of returnVideos) {
      for (const item of video.scannedItems) {
        const existing = breakdown.get(item.productId);
        if (existing) {
          if (item.returnQuality === 'BAD') {
            existing.totalReturnedBad += item.scannedQty;
          } else {
            existing.totalReturnedGood += item.scannedQty;
          }
        } else {
          breakdown.set(item.productId, {
            productName: item.product.name,
            sku: item.product.sku,
            totalDeducted: 0,
            totalReturnedGood: item.returnQuality === 'BAD' ? 0 : item.scannedQty,
            totalReturnedBad: item.returnQuality === 'BAD' ? item.scannedQty : 0,
          });
        }
      }
    }

    return {
      ordersPackedToday,
      ordersReturnedToday,
      videosToday,
      avgDuration,
      productBreakdown: Array.from(breakdown.entries()).map(([productId, v]) => ({ productId, ...v })),
    };
  });
};
