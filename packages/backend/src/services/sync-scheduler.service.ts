import * as cron from 'node-cron';
import type { FastifyInstance } from 'fastify';
import { syncKiotVietOrders } from './sync.service.js';

let scheduledTask: cron.ScheduledTask | null = null;

/**
 * Kiểm tra xem hiện tại có trong khung giờ đồng bộ không (6h sáng - 8h tối)
 */
function isWithinSyncHours(): boolean {
  const now = new Date();
  const hour = now.getHours();
  return hour >= 6 && hour < 20; // 6:00 - 19:59
}

/**
 * Khởi tạo scheduler tự động đồng bộ mỗi 15 giây trong khung giờ 6h-20h
 */
export function startSyncScheduler(app: FastifyInstance): void {
  // Dừng scheduler cũ nếu đang chạy
  if (scheduledTask) {
    scheduledTask.stop();
    app.log.info('Stopped existing sync scheduler');
  }

  const syncInterval = process.env.SYNC_INTERVAL_SECONDS || '15';
  const syncEnabled = process.env.AUTO_SYNC_ENABLED !== 'false'; // Mặc định bật

  if (!syncEnabled) {
    app.log.info('Auto-sync is disabled via AUTO_SYNC_ENABLED env var');
    return;
  }

  // Chạy mỗi 15 giây (hoặc theo config)
  const cronExpression = `*/${syncInterval} * * * * *`;

  scheduledTask = cron.schedule(cronExpression, async () => {
    // Kiểm tra khung giờ
    if (!isWithinSyncHours()) {
      return;
    }

    try {
      app.log.debug('Auto-sync: Starting scheduled sync...');
      const result = await syncKiotVietOrders(app);

      if (result.imported > 0) {
        app.log.info(`Auto-sync: ${result.imported} đơn mới, ${result.skipped} đã có, ${result.total} tổng`);
      } else {
        app.log.debug(`Auto-sync: No new orders (${result.skipped} skipped, ${result.total} total)`);
      }
    } catch (error: any) {
      app.log.error('Auto-sync failed: ' + (error.message || error));
    }
  });

  app.log.info(`Sync scheduler started: Every ${syncInterval}s during 6:00-20:00`);
}

/**
 * Dừng scheduler
 */
export function stopSyncScheduler(app: FastifyInstance): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    app.log.info('Sync scheduler stopped');
  }
}
