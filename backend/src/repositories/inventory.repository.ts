import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

type LedgerListParams = {
  page: number;
  pageSize: number;
  query?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

const inventoryLedgerWhere = (query?: string): Prisma.InventoryMovementWhereInput | undefined => {
  if (!query) {
    return undefined;
  }

  return {
    OR: [
      { product: { name: { contains: query } } },
      { product: { slug: { contains: query } } },
      { variant: { sku: { contains: query } } },
      { reference: { contains: query } },
      { note: { contains: query } },
      { reason: query.toUpperCase() as never },
    ],
  };
};

const inventoryLedgerOrderBy = (
  sort = 'createdAt',
  direction: 'asc' | 'desc' = 'desc',
): Prisma.InventoryMovementOrderByWithRelationInput => {
  switch (sort) {
    case 'delta':
      return { delta: direction };
    case 'reason':
      return { reason: direction };
    default:
      return { createdAt: direction };
  }
};

export const inventoryRepository = {
  adjustProductStock: (db: DbClient, productId: string, delta: number) =>
    db.product.update({
      where: { id: productId },
      data: { stock: { increment: delta } },
    }),
  adjustVariantStock: (db: DbClient, variantId: string, delta: number) =>
    db.productVariant.update({
      where: { id: variantId },
      data: { stock: { increment: delta } },
    }),
  createMovement: (db: DbClient, data: {
    productId: string;
    variantId?: string | null;
    delta: number;
    reason: string;
    source?: string;
    reference?: string | null;
    orderId?: string | null;
    posSaleId?: string | null;
    posReturnId?: string | null;
    note?: string | null;
  }) =>
    db.inventoryMovement.create({
      data: {
        productId: data.productId,
        variantId: data.variantId ?? undefined,
        delta: data.delta,
        reason: data.reason as never,
        source: data.source ? (data.source as never) : undefined,
        reference: data.reference ?? undefined,
        orderId: data.orderId ?? undefined,
        posSaleId: data.posSaleId ?? undefined,
        posReturnId: data.posReturnId ?? undefined,
        note: data.note ?? undefined,
      },
    }),
  listSnapshot: () =>
    prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        variants: true,
      },
      orderBy: { name: 'asc' },
    }),
  async listLedger(params?: LedgerListParams) {
    const where = inventoryLedgerWhere(params?.query);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 50;

    const [items, total] = await Promise.all([
      prisma.inventoryMovement.findMany({
        where,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          variant: true,
          order: true,
          posSale: true,
          posReturn: true,
        },
        orderBy: inventoryLedgerOrderBy(params?.sort, params?.direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inventoryMovement.count({ where }),
    ]);

    return { items, total };
  },
  listLedgerForExport: (query?: string) =>
    prisma.inventoryMovement.findMany({
      where: inventoryLedgerWhere(query),
      include: {
        product: {
          include: {
            category: true,
          },
        },
        variant: true,
        order: true,
        posSale: true,
        posReturn: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
};
