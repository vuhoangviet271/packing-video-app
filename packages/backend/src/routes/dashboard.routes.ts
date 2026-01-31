import type { FastifyPluginAsync } from 'fastify';

export const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.get('/today', async () => {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [ordersPackedToday, ordersReturnedToday, allTodayVideos] = await Promise.all([
      app.prisma.videoRecord.count({
        where: { type: 'PACKING', status: 'COMPLETED', createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      app.prisma.videoRecord.count({
        where: { type: 'RETURN', status: 'COMPLETED', createdAt: { gte: startOfDay, lte: endOfDay } },
      }),
      app.prisma.videoRecord.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: startOfDay, lte: endOfDay } },
        include: { scannedItems: { include: { product: { select: { name: true, sku: true } } } } },
      }),
    ]);

    const videosToday = allTodayVideos.length;
    const avgDuration = videosToday > 0 ? allTodayVideos.reduce((sum, v) => sum + v.duration, 0) / videosToday : 0;
    const todayVideos = allTodayVideos.filter((v) => v.type === 'PACKING');

    const breakdown = new Map<string, { productName: string; sku: string; totalQty: number }>();
    for (const video of todayVideos) {
      for (const item of video.scannedItems) {
        const existing = breakdown.get(item.productId);
        if (existing) {
          existing.totalQty += item.scannedQty;
        } else {
          breakdown.set(item.productId, { productName: item.product.name, sku: item.product.sku, totalQty: item.scannedQty });
        }
      }
    }

    return { ordersPackedToday, ordersReturnedToday, videosToday, avgDuration, productBreakdown: Array.from(breakdown.entries()).map(([productId, v]) => ({ productId, ...v })) };
  });
};
