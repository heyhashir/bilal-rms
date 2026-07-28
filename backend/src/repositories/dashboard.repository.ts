import prisma from '../config/prisma';

export const dashboardRepository = {
  getOrderAggregate() {
    return prisma.order.aggregate({
      where: { orderStatus: { notIn: ['CANCELLED', 'RETURNED'] } },
      _count: { _all: true },
      _sum: { total: true },
    });
  },
  countPendingOrders() {
    return prisma.order.count({
      where: { orderStatus: 'PENDING' },
    });
  },
  listProductStockSnapshot() {
    return prisma.product.findMany({
      select: {
        id: true,
        name: true,
        stockMode: true,
        stock: true,
        category: {
          select: {
            name: true,
          },
        },
        variants: {
          select: {
            stock: true,
            isActive: true,
          },
        },
      },
    });
  },
  countReturns() {
    return prisma.returnRequest.count();
  },
  countEmployees() {
    return prisma.employee.count();
  },
  countPosSales() {
    return prisma.posSale.count({
      where: { status: { in: ['FINALIZED', 'REFUNDED'] } },
    });
  },
  getPosRevenueAggregate() {
    return prisma.posSale.findMany({
      where: {
        status: { in: ['FINALIZED', 'REFUNDED'] },
      },
      select: {
        total: true,
        returns: {
          select: { amount: true },
        },
      },
    });
  },
  getPendingCommissionAggregate() {
    return prisma.commissionEntry.aggregate({
      where: { status: { in: ['EARNED', 'REVERSED'] } },
      _sum: {
        amount: true,
      },
    });
  },
  listRecentOrders() {
    return prisma.order.findMany({
      where: { orderStatus: { notIn: ['CANCELLED', 'RETURNED'] } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        orderNumber: true,
        customerName: true,
        total: true,
        orderStatus: true,
        createdAt: true,
      },
    });
  },
  listRecentPosSales() {
    return prisma.posSale.findMany({
      where: {
        status: { in: ['FINALIZED', 'REFUNDED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        saleNumber: true,
        customerName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });
  },
  listEmployeesWithPendingCommission() {
    return prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        commissionRate: true,
        commissionEntries: {
          where: { status: { in: ['EARNED', 'REVERSED'] } },
          select: {
            amount: true,
          },
        },
      },
    });
  },
};
