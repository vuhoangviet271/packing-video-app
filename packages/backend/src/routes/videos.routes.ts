import type { FastifyPluginAsync } from 'fastify';

export const videoRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', { preHandler: [app.authenticate] }, async (request) => {
    const body = request.body as any;
    return app.prisma.videoRecord.create({
      data: {
        shippingCode: body.shippingCode,
        orderId: body.orderId || null,
        staffId: body.staffId,
        type: body.type,
        status: body.status || 'COMPLETED',
        duration: body.duration || 0,
        fileName: body.fileName,
        machineName: body.machineName,
        scannedItems: body.scannedItems
          ? {
              create: body.scannedItems.map((i: any) => ({
                productId: i.productId,
                scannedQty: i.scannedQty,
                returnQuality: i.returnQuality || null,
              })),
            }
          : undefined,
      },
      include: {
        staff: { select: { id: true, fullName: true } },
        scannedItems: { include: { product: true } },
      },
    });
  });

  app.get('/', async (request) => {
    const {
      type, status, staffId, shippingCode,
      from, to, page = '1', limit = '10',
    } = request.query as any;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (staffId) where.staffId = staffId;
    if (shippingCode) where.shippingCode = { contains: shippingCode };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from + 'T00:00:00+07:00');
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999+07:00');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      app.prisma.videoRecord.findMany({
        where,
        include: { staff: { select: { id: true, fullName: true } } },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.videoRecord.count({ where }),
    ]);

    return {
      data,
      total,
      page: parseInt(page),
      limit: take,
      totalPages: Math.ceil(total / take),
    };
  });

  app.get('/search', async (request) => {
    const { q, page = '1', limit = '10' } = request.query as any;
    const where = { shippingCode: { contains: q || '' } };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [data, total] = await Promise.all([
      app.prisma.videoRecord.findMany({
        where,
        include: { staff: { select: { id: true, fullName: true } } },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      app.prisma.videoRecord.count({ where }),
    ]);

    return { data, total, page: parseInt(page), limit: take, totalPages: Math.ceil(total / take) };
  });

  app.get('/export', async (request, reply) => {
    const { type, status, staffId, from, to } = request.query as any;
    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (staffId) where.staffId = staffId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from + 'T00:00:00+07:00');
      if (to) where.createdAt.lte = new Date(to + 'T23:59:59.999+07:00');
    }

    const records = await app.prisma.videoRecord.findMany({
      where,
      include: { staff: { select: { fullName: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Ma van don,Thoi luong (s),Trang thai,Nhan vien,Thoi gian tao,Loai\n';
    const rows = records
      .map((r) => [r.shippingCode, r.duration, r.status, r.staff.fullName, r.createdAt.toISOString(), r.type].join(','))
      .join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="videos.csv"');
    return header + rows;
  });
};
