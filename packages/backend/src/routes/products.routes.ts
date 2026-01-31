import type { FastifyPluginAsync } from 'fastify';

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async (request) => {
    const { search, isCombo, page = '1', limit = '50' } = request.query as any;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: any = {};
    if (search) {
      where.OR = [{ sku: { contains: search } }, { name: { contains: search } }, { barcode: { contains: search } }];
    }
    if (isCombo !== undefined) where.isCombo = isCombo === 'true';

    const [data, total] = await Promise.all([
      app.prisma.product.findMany({ where, include: { comboComponents: { include: { component: true } } }, skip, take: parseInt(limit), orderBy: { createdAt: 'desc' } }),
      app.prisma.product.count({ where }),
    ]);
    return { data, total, page: parseInt(page), limit: parseInt(limit) };
  });

  app.get('/by-barcode/:barcode', async (request, reply) => {
    const { barcode } = request.params as { barcode: string };
    const product = await app.prisma.product.findUnique({ where: { barcode }, include: { comboComponents: { include: { component: true } } } });
    if (!product) return reply.status(404).send({ error: 'Product not found' });
    return product;
  });

  app.post('/', { preHandler: [app.authenticate] }, async (request) => {
    const { sku, barcode, name, imageUrl, quantity } = request.body as any;
    return app.prisma.product.create({ data: { sku, barcode: barcode || null, name, imageUrl: imageUrl || null, isCombo: false, quantity: quantity || 0 } });
  });

  app.post('/combo', { preHandler: [app.authenticate] }, async (request) => {
    const { sku, barcode, name, imageUrl, components } = request.body as any;
    return app.prisma.product.create({
      data: {
        sku, barcode: barcode || null, name, imageUrl: imageUrl || null, isCombo: true, quantity: 0,
        comboComponents: { create: components.map((c: any) => ({ componentId: c.componentId, quantity: c.quantity })) },
      },
      include: { comboComponents: { include: { component: true } } },
    });
  });

  app.put('/:id', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    if (data.components) {
      await app.prisma.comboComponent.deleteMany({ where: { comboId: id } });
      await app.prisma.comboComponent.createMany({ data: data.components.map((c: any) => ({ comboId: id, componentId: c.componentId, quantity: c.quantity })) });
      delete data.components;
    }
    return app.prisma.product.update({ where: { id }, data, include: { comboComponents: { include: { component: true } } } });
  });

  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.product.delete({ where: { id } });
    return reply.status(204).send();
  });
};
