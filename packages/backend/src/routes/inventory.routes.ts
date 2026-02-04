import type { FastifyPluginAsync } from 'fastify';
import { deductPackingInventory, processReturn, manualAdjust } from '../services/inventory.service.js';

export const inventoryRoutes: FastifyPluginAsync = async (app) => {
  app.post('/packing-complete', { preHandler: [app.authenticate] }, async (request) => {
    const { shippingCode, items } = request.body as {
      shippingCode: string;
      items: { productId: string; quantity: number }[];
    };
    await deductPackingInventory(app.prisma, shippingCode, items);
    return { success: true };
  });

  app.post('/return-complete', { preHandler: [app.authenticate] }, async (request) => {
    const { shippingCode, items } = request.body as {
      shippingCode: string;
      items: { productId: string; quantity: number; quality: 'GOOD' | 'BAD' }[];
    };
    await processReturn(app.prisma, shippingCode, items);
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

  // GET /logs - Lấy danh sách transaction log với product info (for admin UI)
  app.get('/logs', async (request) => {
    const { productId, page = '1', limit = '50', from, to, action, search } = request.query as any;
    const where: any = {};
    if (productId) where.productId = productId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }
    if (search) {
      where.OR = [
        { reference: { contains: search } },
        { product: { sku: { contains: search } } },
        { product: { name: { contains: search } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [transactions, total] = await Promise.all([
      app.prisma.inventoryTransaction.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              barcode: true,
            },
          },
          staff: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      app.prisma.inventoryTransaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };
  });
};
