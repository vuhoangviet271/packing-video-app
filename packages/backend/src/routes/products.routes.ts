import type { FastifyPluginAsync } from 'fastify';
import { createWriteStream, createReadStream } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { randomUUID } from 'crypto';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

export const productRoutes: FastifyPluginAsync = async (app) => {
  // Ensure uploads directory exists
  await mkdir(UPLOADS_DIR, { recursive: true });

  // Serve uploaded images
  app.get('/uploads/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return reply.status(400).send({ error: 'Invalid filename' });
    }
    const filePath = join(UPLOADS_DIR, filename);
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp',
    };
    reply.header('Content-Type', mimeTypes[ext || ''] || 'application/octet-stream');
    reply.header('Cache-Control', 'public, max-age=86400');
    return reply.send(createReadStream(filePath));
  });

  // Upload product image
  app.post('/upload-image', { preHandler: [app.authenticate] }, async (request) => {
    const data = await request.file();
    if (!data) throw new Error('No file uploaded');

    const ext = data.filename.split('.').pop()?.toLowerCase() || 'jpg';
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!allowed.includes(ext)) throw new Error('Invalid file type');

    const newFilename = `${randomUUID()}.${ext}`;
    const filePath = join(UPLOADS_DIR, newFilename);
    await pipeline(data.file, createWriteStream(filePath));

    const imageUrl = `/api/products/uploads/${newFilename}`;
    return { imageUrl };
  });
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

  app.put('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = request.body as any;
    if (data.components) {
      await app.prisma.comboComponent.deleteMany({ where: { comboId: id } });
      await app.prisma.comboComponent.createMany({ data: data.components.map((c: any) => ({ comboId: id, componentId: c.componentId, quantity: c.quantity })) });
      delete data.components;
    }
    try {
      return await app.prisma.product.update({ where: { id }, data, include: { comboComponents: { include: { component: true } } } });
    } catch (err: any) {
      if (err.code === 'P2002') {
        const field = err.meta?.target?.[0] || 'field';
        return reply.status(409).send({ error: `${field} đã tồn tại ở sản phẩm khác` });
      }
      throw err;
    }
  });

  app.delete('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await app.prisma.product.delete({ where: { id } });
    return reply.status(204).send();
  });
};
