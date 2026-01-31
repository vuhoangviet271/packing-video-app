import type { PrismaClient } from '@prisma/client';

export async function deductPackingInventory(prisma: PrismaClient, videoRecordId: string) {
  const video = await prisma.videoRecord.findUnique({
    where: { id: videoRecordId },
    include: {
      order: {
        include: {
          items: {
            include: {
              product: { include: { comboComponents: true } },
            },
          },
        },
      },
    },
  });

  if (!video?.order) return;

  await prisma.$transaction(async (tx) => {
    for (const item of video.order!.items) {
      if (item.product.isCombo) {
        for (const comp of item.product.comboComponents) {
          const deductQty = comp.quantity * item.quantity;
          await tx.product.update({
            where: { id: comp.componentId },
            data: { quantity: { decrement: deductQty } },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: comp.componentId,
              action: 'PACKING_DEDUCT',
              quantity: -deductQty,
              reference: video.shippingCode,
            },
          });
        }
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: {
            productId: item.productId,
            action: 'PACKING_DEDUCT',
            quantity: -item.quantity,
            reference: video.shippingCode,
          },
        });
      }
    }
  });
}

export async function processReturn(
  prisma: PrismaClient,
  videoRecordId: string,
  items: { productId: string; quantity: number; quality: 'GOOD' | 'BAD' }[]
) {
  const video = await prisma.videoRecord.findUnique({ where: { id: videoRecordId } });
  if (!video) return;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (item.quality === 'GOOD') {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, action: 'RETURN_GOOD', quantity: item.quantity, reference: video.shippingCode },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { unsellableQty: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, action: 'RETURN_BAD', quantity: item.quantity, reference: video.shippingCode },
        });
      }
    }
  });
}

export async function manualAdjust(prisma: PrismaClient, productId: string, quantity: number, note?: string) {
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: { quantity: { increment: quantity } } });
    await tx.inventoryTransaction.create({
      data: { productId, action: 'MANUAL_ADJUST', quantity, reference: note || null },
    });
  });
}
