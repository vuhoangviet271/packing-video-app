import type { FastifyPluginAsync } from 'fastify';

export const orderRoutes: FastifyPluginAsync = async (app) => {
  app.get('/:shippingCode', async (request, reply) => {
    const { shippingCode } = request.params as { shippingCode: string };
    const order = await app.prisma.order.findUnique({
      where: { shippingCode },
      include: { items: { include: { product: { include: { comboComponents: { include: { component: true } } } } } } },
    });
    if (!order) return reply.status(404).send({ error: 'Order not found' });
    return order;
  });

  app.post('/', { preHandler: [app.authenticate] }, async (request) => {
    const { shippingCode, items } = request.body as { shippingCode: string; items: { sku: string; quantity: number }[] };
    const products = await app.prisma.product.findMany({ where: { sku: { in: items.map((i) => i.sku) } } });
    const productMap = new Map(products.map((p) => [p.sku, p]));
    return app.prisma.order.create({
      data: {
        shippingCode, source: 'manual',
        items: { create: items.filter((i) => productMap.has(i.sku)).map((i) => ({ productId: productMap.get(i.sku)!.id, quantity: i.quantity })) },
      },
      include: { items: { include: { product: true } } },
    });
  });
};
