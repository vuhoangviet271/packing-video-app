import type { FastifyPluginAsync } from 'fastify';
import { deductPackingInventory, processReturn, manualAdjust } from '../services/inventory.service.js';

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  app.post('/packing-complete', { preHandler: [app.authenticate] }, async (request) => {
    const { videoRecordId } = request.body as { videoRecordId: string };
    await deductPackingInventory(app.prisma, videoRecordId);
    return { success: true };
  });

  app.post('/return-complete', { preHandler: [app.authenticate] }, async (request) => {
    const { videoRecordId, items } = request.body as {
      videoRecordId: string;
      items: { productId: string; quantity: number; quality: 'GOOD' | 'BAD' }[];
    };
    await processReturn(app.prisma, videoRecordId, items);
    return { success: true };
  });

  app.post('/manual-adjust', { preHandler: [app.authenticate] }, async (request) => {
    const { productId, quantity, note } = request.body as { productId: string; quantity: number; note?: string };
    await manualAdjust(app.prisma, productId, quantity, note);
    return { success: true };
  });

  app.get('/transactions', async (request) => {
    const { productId, from, to, page = '1', limit = '50' } = request.query as any;
    const where: any = {};
    if (productId) where.productId = productId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      app.prisma.inventoryTransaction.findMany({ where, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      app.prisma.inventoryTransaction.count({ where }),
    ]);
    return { data, total, page: parseInt(page), limit: parseInt(limit) };
  });
};
