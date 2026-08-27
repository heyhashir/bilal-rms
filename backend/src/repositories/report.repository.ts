import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

type DateRange = {
  from?: Date;
  to?: Date;
};

const toCreatedAtRange = (range: DateRange): Prisma.DateTimeFilter | undefined => {
  if (!range.from && !range.to) {
    return undefined;
  }

  return {
    gte: range.from,
    lte: range.to,
  };
};

export const reportRepository = {
  listOrders(range: DateRange) {
    return prisma.order.findMany({
      where: {
        createdAt: toCreatedAtRange(range),
        orderStatus: { notIn: ['CANCELLED', 'RETURNED'] },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  listPosSales(range: DateRange) {
    return prisma.posSale.findMany({
      where: {
        createdAt: toCreatedAtRange(range),
        status: { in: ['FINALIZED', 'REFUNDED'] },
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            variant: true,
          },
        },
        returns: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  listPosSalesForBillWise(range: DateRange) {
    return prisma.posSale.findMany({
      where: {
        createdAt: toCreatedAtRange(range),
        status: { in: ['FINALIZED', 'REFUNDED'] },
      },
      include: {
        items: {
          include: {
            employee: true,
          },
        },
        payments: true,
        returns: {
          include: {
            saleItem: true,
          },
        },
        voidedBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  listCommissionEntries(range: DateRange) {
    return prisma.commissionEntry.findMany({
      where: { createdAt: toCreatedAtRange(range) },
      include: {
        employee: true,
        saleItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  listLedgerEntries(range: DateRange) {
    return prisma.ledgerEntry.findMany({
      where: { createdAt: toCreatedAtRange(range) },
      orderBy: { createdAt: 'desc' },
    });
  },
  listVendorPurchases(range: DateRange) {
    return prisma.vendorPurchase.findMany({
      where: {
        purchasedAt: toCreatedAtRange(range),
        reversedAt: null,
      },
      include: {
        vendor: true,
        product: true,
      },
      orderBy: { purchasedAt: 'desc' },
    });
  },
};
