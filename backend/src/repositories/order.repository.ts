import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

type DbClient = Prisma.TransactionClient | typeof prisma;

export const orderInclude = {
  items: true,
  paymentProof: true,
} satisfies Prisma.OrderInclude;

type OrderListParams = {
  page: number;
  pageSize: number;
  query?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
};

const orderListWhere = (query?: string): Prisma.OrderWhereInput | undefined => {
  if (!query) {
    return undefined;
  }

  return {
    OR: [
      { orderNumber: { contains: query } },
      { customerName: { contains: query } },
      { email: { contains: query } },
      { phone: { contains: query } },
      { shippingZoneName: { contains: query } },
    ],
  };
};

const buildOrderBy = (sort = 'createdAt', direction: 'asc' | 'desc' = 'desc'): Prisma.OrderOrderByWithRelationInput => {
  switch (sort) {
    case 'total':
      return { total: direction };
    case 'customerName':
      return { customerName: direction };
    case 'orderNumber':
      return { orderNumber: direction };
    case 'status':
      return { orderStatus: direction };
    case 'paymentStatus':
      return { paymentStatus: direction };
    default:
      return { createdAt: direction };
  }
};

export const orderRepository = {
  findShippingZoneById(shippingZoneId: string) {
    return prisma.shippingZone.findUniqueOrThrow({
      where: { id: shippingZoneId },
    });
  },
  findCheckoutProductsByIds(ids: string[]) {
    return prisma.product.findMany({
      where: { id: { in: ids } },
      include: {
        images: true,
        variants: true,
        category: true,
        brand: true,
      },
    });
  },
  async findAdminOrders(params?: OrderListParams) {
    const where = orderListWhere(params?.query);
    const page = params?.page ?? 1;
    const pageSize = params?.pageSize ?? 20;

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: buildOrderBy(params?.sort, params?.direction),
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    return { items, total };
  },
  findUserOrders(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      include: orderInclude,
      orderBy: { createdAt: 'desc' },
    });
  },
  findByOrderNumber(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: orderInclude,
    });
  },
  findTrackedOrder(orderNumber: string, email: string) {
    return prisma.order.findFirst({
      where: {
        orderNumber,
        email: email.toLowerCase(),
      },
      include: orderInclude,
    });
  },
  updateStatuses(orderNumber: string, data: { orderStatus?: string; paymentStatus?: string }) {
    return prisma.order.update({
      where: { orderNumber },
      data: {
        orderStatus: data.orderStatus as never,
        paymentStatus: data.paymentStatus as never,
      },
      include: orderInclude,
    });
  },
  findAdminReturns() {
    return prisma.returnRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },
  createOrder(tx: Prisma.TransactionClient, data: Prisma.OrderUncheckedCreateInput) {
    return tx.order.create({ data });
  },
  createOrderItem(tx: Prisma.TransactionClient, data: Prisma.OrderItemUncheckedCreateInput) {
    return tx.orderItem.create({ data });
  },
  createPaymentProof(tx: Prisma.TransactionClient, data: Prisma.PaymentProofUncheckedCreateInput) {
    return tx.paymentProof.create({ data });
  },
  findOrderById(tx: Prisma.TransactionClient, orderId: string) {
    return tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: orderInclude,
    });
  },
  findOrderForReturn(orderNumber: string) {
    return prisma.order.findUniqueOrThrow({
      where: { orderNumber },
    });
  },
  createReturnRequest(data: Prisma.ReturnRequestUncheckedCreateInput) {
    return prisma.returnRequest.create({ data });
  },
  updateOrderStatusById(
    db: DbClient,
    orderId: string,
    orderStatus: 'RETURN_REQUESTED' | 'RETURNED' | 'DELIVERED',
  ) {
    return db.order.update({
      where: { id: orderId },
      data: { orderStatus },
    });
  },
  findReturnRequestWithOrderItems(tx: Prisma.TransactionClient, returnRequestId: string) {
    return tx.returnRequest.findUniqueOrThrow({
      where: { id: returnRequestId },
      include: {
        order: {
          include: {
            items: true,
          },
        },
      },
    });
  },
  updateReturnRequest(
    tx: Prisma.TransactionClient,
    returnRequestId: string,
    data: Prisma.ReturnRequestUpdateInput,
  ) {
    return tx.returnRequest.update({
      where: { id: returnRequestId },
      data,
    });
  },
  upsertRefundRecord(
    tx: Prisma.TransactionClient,
    returnRequestId: string,
    data: { amount: number; note: string },
  ) {
    return tx.refundRecord.upsert({
      where: { returnRequestId },
      update: data,
      create: {
        returnRequestId,
        ...data,
      },
    });
  },
};
