import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { inventoryRepository } from '../repositories/inventory.repository';

type DbClient = Prisma.TransactionClient | typeof prisma;

type StockMutationInput = {
  productId: string;
  variantId?: string | null;
  delta: number;
  reason: 'ORDER' | 'RETURN' | 'ADJUSTMENT' | 'POS_SALE' | 'POS_REFUND';
  source?: 'ONLINE' | 'POS';
  reference?: string | null;
  orderId?: string | null;
  posSaleId?: string | null;
  posReturnId?: string | null;
  note?: string | null;
};

export const inventoryService = {
  async applyStockMutation(db: DbClient, input: StockMutationInput): Promise<void> {
    if (input.variantId) {
      await inventoryRepository.adjustVariantStock(db, input.variantId, input.delta);
    } else {
      await inventoryRepository.adjustProductStock(db, input.productId, input.delta);
    }

    await inventoryRepository.createMovement(db, input);
  },
  async adjustInventory(input: {
    productId: string;
    variantId?: string | null;
    delta: number;
    note?: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await inventoryService.applyStockMutation(tx, {
        productId: input.productId,
        variantId: input.variantId ?? null,
        delta: input.delta,
        reason: 'ADJUSTMENT',
        note: input.note || null,
      });
    });
  },
  recordOrderSale(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; orderId: string; reference: string }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: -input.qty,
      reason: 'ORDER',
      source: 'ONLINE',
      orderId: input.orderId,
      reference: input.reference,
      note: input.reference,
    });
  },
  recordOrderReturn(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; orderId: string; reference: string; note?: string | null }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.qty,
      reason: 'RETURN',
      source: 'ONLINE',
      orderId: input.orderId,
      reference: input.reference,
      note: input.note ?? input.reference,
    });
  },
  recordPosSale(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; posSaleId: string; reference: string }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: -input.qty,
      reason: 'POS_SALE',
      source: 'POS',
      posSaleId: input.posSaleId,
      reference: input.reference,
      note: input.reference,
    });
  },
  recordPosRefund(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; posSaleId: string; posReturnId: string; reference: string; note?: string | null }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.qty,
      reason: 'POS_REFUND',
      source: 'POS',
      posSaleId: input.posSaleId,
      posReturnId: input.posReturnId,
      reference: input.reference,
      note: input.note ?? input.reference,
    });
  },
  getInventorySnapshot() {
    return inventoryRepository.listSnapshot();
  },
  getInventoryLedger(params?: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }) {
    return inventoryRepository.listLedger(params);
  },
  getInventoryLedgerForExport(query?: string) {
    return inventoryRepository.listLedgerForExport(query);
  },
};
