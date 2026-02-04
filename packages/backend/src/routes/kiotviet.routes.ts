import type { FastifyPluginAsync } from 'fastify';
import { syncKiotVietOrders } from '../services/sync.service.js';

export const kiotvietRoutes: FastifyPluginAsync = async (app) => {
  app.post('/sync', { preHandler: [app.authenticate] }, async () => {
    return await syncKiotVietOrders(app);
  });
};
