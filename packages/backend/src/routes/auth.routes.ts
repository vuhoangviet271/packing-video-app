import type { FastifyPluginAsync } from 'fastify';
import bcrypt from 'bcryptjs';

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/login', async (request, reply) => {
    const { username, password } = request.body as { username: string; password: string };
    const staff = await app.prisma.staff.findUnique({ where: { username } });
    if (!staff) return reply.status(401).send({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, staff.password);
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' });

    const token = app.jwt.sign({ id: staff.id, username: staff.username });
    return {
      token,
      staff: { id: staff.id, username: staff.username, fullName: staff.fullName, role: staff.role, active: staff.active, createdAt: staff.createdAt.toISOString() },
    };
  });

  app.get('/me', { preHandler: [app.authenticate] }, async (request) => {
    const { id } = request.user as { id: string };
    const staff = await app.prisma.staff.findUnique({ where: { id } });
    if (!staff) throw new Error('Staff not found');
    return { id: staff.id, username: staff.username, fullName: staff.fullName, role: staff.role, active: staff.active, createdAt: staff.createdAt.toISOString() };
  });
};
