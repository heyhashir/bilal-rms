import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

export const commissionInclude = {
  employee: true,
  sale: true,
  saleItem: true,
} satisfies Prisma.CommissionEntryInclude;

type CommissionListParams = {
  page: number;
  pageSize: number;
  query?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

const commissionWhere = (query?: string): Prisma.CommissionEntryWhereInput | undefined => {
  if (!query) {
    return undefined;
  }

  return {
    OR: [
      { employee: { name: { contains: query } } },
      { sale: { saleNumber: { contains: query } } },
      { saleItem: { name: { contains: query } } },
      { status: query.toUpperCase() as never },
    ],
  };
};

const commissionOrderBy = (
  sort = 'createdAt',
  direction: 'asc' | 'desc' = 'desc',
): Prisma.CommissionEntryOrderByWithRelationInput => {
  switch (sort) {
    case 'amount':
      return { amount: direction };
    case 'status':
      return { status: direction };
    default:
      return { createdAt: direction };
  }
};

export const commissionRepository = {
  async list(params?: CommissionListParams) {
    const where = commissionWhere(params?.query);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    const [items, total] = await Promise.all([
      prisma.commissionEntry.findMany({
        where,
        include: commissionInclude,
        orderBy: commissionOrderBy(params?.sort, params?.direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.commissionEntry.count({ where }),
    ]);

    return { items, total };
  },
  listForExport: (query?: string) =>
    prisma.commissionEntry.findMany({
      where: commissionWhere(query),
      include: commissionInclude,
      orderBy: { createdAt: 'desc' },
    }),
  updateStatus: (id: string, status: string, note: string) =>
    prisma.commissionEntry.update({
      where: { id },
      data: {
        status: status as never,
        note,
      },
      include: commissionInclude,
    }),
};
