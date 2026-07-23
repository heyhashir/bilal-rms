import prisma from '../config/prisma';

type CustomerListParams = {
  page: number;
  pageSize: number;
  query?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

const customerWhere = (query?: string) => {
  if (!query) {
    return { role: 'CUSTOMER' as const };
  }

  return {
    role: 'CUSTOMER' as const,
    OR: [
      { name: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
    ],
  };
};

const customerOrderBy = (sort = 'createdAt', direction: 'asc' | 'desc' = 'desc') => {
  switch (sort) {
    case 'name':
      return { name: direction } as const;
    case 'email':
      return { email: direction } as const;
    default:
      return { createdAt: direction } as const;
  }
};

export const customerRepository = {
  async listCustomers(params?: CustomerListParams) {
    const where = customerWhere(params?.query);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { addresses: true },
        orderBy: customerOrderBy(params?.sort, params?.direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  },
  listCustomersForExport(query?: string) {
    return prisma.user.findMany({
      where: customerWhere(query),
      include: { addresses: true },
      orderBy: { createdAt: 'desc' },
    });
  },
  summarizeOrdersByUserId() {
    return prisma.order.groupBy({
      by: ['userId'],
      where: {
        userId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
      _sum: {
        total: true,
      },
    });
  },
  summarizeGuestOrdersByEmail() {
    return prisma.order.groupBy({
      by: ['email'],
      _count: {
        _all: true,
      },
      _sum: {
        total: true,
      },
    });
  },
};
