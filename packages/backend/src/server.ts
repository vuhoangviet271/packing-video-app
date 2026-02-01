import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { prismaPlugin } from './plugins/prisma.js';
import { authRoutes } from './routes/auth.routes.js';
import { productRoutes } from './routes/products.routes.js';
import { orderRoutes } from './routes/orders.routes.js';
import { videoRoutes } from './routes/videos.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { dashboardRoutes } from './routes/dashboard.routes.js';
import { webhookRoutes } from './routes/webhook.routes.js';
import { kiotvietRoutes } from './routes/kiotviet.routes.js';

const app = Fastify({ logger: true });

async function start() {
  await app.register(cors, { origin: true });
  await app.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });
  await app.register(multipart);
  await app.register(prismaPlugin);

  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(productRoutes, { prefix: '/api/products' });
  await app.register(orderRoutes, { prefix: '/api/orders' });
  await app.register(videoRoutes, { prefix: '/api/videos' });
  await app.register(inventoryRoutes, { prefix: '/api/inventory' });
  await app.register(dashboardRoutes, { prefix: '/api/dashboard' });
  await app.register(webhookRoutes, { prefix: '/api/webhook' });
  await app.register(kiotvietRoutes, { prefix: '/api/kiotviet' });

  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen({ port, host: '0.0.0.0' });

  // Daily cleanup: orders 10 ngày, videos 3 tháng
  async function dailyCleanup() {
    try {
      const orderCutoff = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const videoCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const orders = await app.prisma.order.deleteMany({
        where: { createdAt: { lt: orderCutoff } },
      });
      const videos = await app.prisma.videoRecord.deleteMany({
        where: { createdAt: { lt: videoCutoff } },
      });

      if (orders.count > 0 || videos.count > 0) {
        app.log.info(`Cleanup: ${orders.count} orders, ${videos.count} videos deleted`);
      }
    } catch (err) {
      app.log.error('Cleanup failed: ' + err);
    }
  }

  await dailyCleanup();
  setInterval(dailyCleanup, 24 * 60 * 60 * 1000);
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
