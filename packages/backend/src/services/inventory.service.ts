import type { PrismaClient } from '@prisma/client';

export async function deductPackingInventory(
  prisma: PrismaClient,
  shippingCode: string,
  items: { productId: string; quantity: number }[],
  staffId?: string,
  machineName?: string
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
          staffId,
          machineName,
        },
      });
    }
  });
}

export async function processReturn(
  prisma: PrismaClient,
  shippingCode: string,
  items: { productId: string; quantity: number; quality: 'GOOD' | 'BAD' }[],
  staffId?: string,
  machineName?: string
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
          data: { productId: item.productId, action: 'RETURN_GOOD', quantity: item.quantity, reference: shippingCode, staffId, machineName },
        });
      } else {
        await tx.product.update({
          where: { id: item.productId },
          data: { unsellableQty: { increment: item.quantity } },
        });
        await tx.inventoryTransaction.create({
          data: { productId: item.productId, action: 'RETURN_BAD', quantity: item.quantity, reference: shippingCode, staffId, machineName },
        });
      }
    }
  });
}

export async function manualAdjust(
  prisma: PrismaClient,
  productId: string,
  quantity: number,
  note?: string,
  staffId?: string,
  machineName?: string
) {
  await prisma.$transaction(async (tx) => {
    await tx.product.update({ where: { id: productId }, data: { quantity: { increment: quantity } } });
    await tx.inventoryTransaction.create({
      data: { productId, action: 'MANUAL_ADJUST', quantity, reference: note || null, staffId, machineName },
    });
  });
}

/**
 * Log khi admin sửa số lượng trực tiếp trong tab kho
 */
export async function logDirectEdit(
  prisma: PrismaClient,
  productId: string,
  oldQuantity: number,
  newQuantity: number,
  oldUnsellableQty: number,
  newUnsellableQty: number,
  staffId?: string,
  machineName?: string
) {
  const changes: Array<{ action: string; quantity: number; reference: string }> = [];

  // Log thay đổi quantity
  if (oldQuantity !== newQuantity) {
    const delta = newQuantity - oldQuantity;
    changes.push({
      action: 'DIRECT_EDIT',
      quantity: delta,
      reference: `Sửa trực tiếp: ${oldQuantity} → ${newQuantity}`,
    });
  }

  // Log thay đổi unsellableQty
  if (oldUnsellableQty !== newUnsellableQty) {
    const delta = newUnsellableQty - oldUnsellableQty;
    changes.push({
      action: 'DIRECT_EDIT_UNSELLABLE',
      quantity: delta,
      reference: `Sửa kho lỗi: ${oldUnsellableQty} → ${newUnsellableQty}`,
    });
  }

  // Tạo transaction logs
  if (changes.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const change of changes) {
        await tx.inventoryTransaction.create({
          data: {
            productId,
            action: change.action,
            quantity: change.quantity,
            reference: change.reference,
            staffId,
            machineName,
          },
        });
      }
    });
  }
}
