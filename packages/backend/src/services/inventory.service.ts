import type { PrismaClient } from '@prisma/client';

export async function deductPackingInventory(
  prisma: PrismaClient,
  shippingCode: string,
  items: { productId: string; quantity: number }[]
) {
  if (!items || items.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: item.productId,
          action: 'PACKING_DEDUCT',
          quantity: -item.quantity,
          reference: shippingCode,
        },
      });
    }
  });
}

export async function processReturn(
  prisma: PrismaClient,
  shippingCode: string,
  items: { productId: string; quantity: number; quality: 'GOOD' | 'BAD' }[]
) {
  if (!items || items.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      if (item.quality === 'GOOD') {
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, action: 'RETURN_GOOD', quantity: item.quantity, reference: shippingCode },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { unsellableQty: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, action: 'RETURN_BAD', quantity: item.quantity, reference: shippingCode },
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
