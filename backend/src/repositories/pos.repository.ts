import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export const posSaleInclude = {
  items: {
    include: {
      employee: true,
    },
  },
  payments: true,
  returns: true,
  receipt: true,
} satisfies Prisma.PosSaleInclude;

type PosSaleListParams = {
  page: number;
  pageSize: number;
  query?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

const posSaleWhere = (query?: string): Prisma.PosSaleWhereInput | undefined => {
  if (!query) {
    return undefined;
  }

  return {
    OR: [
      { saleNumber: { contains: query } },
      { customerName: { contains: query } },
      { customerPhone: { contains: query } },
      { customerEmail: { contains: query } },
      { receipt: { is: { receiptNumber: { contains: query } } } },
    ],
  };
};

const posSaleOrderBy = (sort = 'createdAt', direction: 'asc' | 'desc' = 'desc'): Prisma.PosSaleOrderByWithRelationInput => {
  switch (sort) {
    case 'total':
      return { total: direction };
    case 'saleNumber':
      return { saleNumber: direction };
    case 'status':
      return { status: direction };
    default:
      return { createdAt: direction };
  }
};

export const posRepository = {
  async listSales(params?: PosSaleListParams) {
    const where = posSaleWhere(params?.query);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    const [items, total] = await Promise.all([
      prisma.posSale.findMany({
        where,
        include: posSaleInclude,
        orderBy: posSaleOrderBy(params?.sort, params?.direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.posSale.count({ where }),
    ]);

    return { items, total };
  },
  listSalesForExport: (query?: string) =>
    prisma.posSale.findMany({
      where: posSaleWhere(query),
      include: posSaleInclude,
      orderBy: { createdAt: 'desc' },
    }),
  findSaleByNumber: (saleNumber: string) =>
    prisma.posSale.findUniqueOrThrow({
      where: { saleNumber },
      include: posSaleInclude,
    }),
  findSaleByNumberOptional: (saleNumber: string) =>
    prisma.posSale.findUnique({
      where: { saleNumber },
      include: posSaleInclude,
    }),
  upsertRegisterDevice: (deviceKey: string, name: string) =>
    prisma.registerDevice.upsert({
      where: { deviceKey },
      update: {
        name,
        lastSeenAt: new Date(),
      },
      create: {
        deviceKey,
        name,
        lastSeenAt: new Date(),
        syncStatus: 'SYNCED',
      },
    }),
  incrementReceiptReprintBySaleId: (saleId: string) =>
    prisma.receipt.update({
      where: { saleId },
      data: {
        reprintCount: { increment: 1 },
        lastPrintedAt: new Date(),
      },
    }),
};
