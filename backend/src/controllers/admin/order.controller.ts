import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializeOrder } from '../../utils/serializers';
import { orderService } from '../../services/order.service';
import { logAdminAudit } from '../../utils/adminAudit';
import { buildListMeta, parseListQuery } from '../../utils/list-query';
import { toCsv } from '../../utils/csv';

export const listOrders = async (req: Request, res: Response) => {
  const query = parseListQuery(req, { defaultSort: 'createdAt', defaultPageSize: 20 });
  const orders = await orderService.listAdminOrders(query);
  res.status(200).json(
    ApiResponse.success('Orders loaded', {
      orders: orders.items.map(serializeOrder),
      meta: buildListMeta(query, orders.total),
    }),
  );
};

export const exportOrders = async (req: Request, res: Response) => {
  const orders = await orderService.listAdminOrders({
    page: 1,
    pageSize: 10000,
    query: typeof req.query.query === 'string' ? req.query.query.trim() : '',
    sort: 'createdAt',
    direction: 'desc',
  });

  const csv = toCsv(
    [
      'orderNumber',
      'customerName',
      'email',
      'phone',
      'orderStatus',
      'paymentStatus',
      'paymentMethod',
      'shippingZone',
      'shippingFee',
      'subtotal',
      'total',
      'createdAt',
    ],
    orders.items.map((order) => ({
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      email: order.email,
      phone: order.phone,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      shippingZone: order.shippingZoneName,
      shippingFee: Number(order.shippingFee),
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      createdAt: order.createdAt.toISOString(),
    })),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');
  res.status(200).send(csv);
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  const { orderStatus, paymentStatus } = req.body as { orderStatus?: string; paymentStatus?: string };
  const order = await orderService.updateStatuses(req.params.orderNumber, { orderStatus, paymentStatus });
  logAdminAudit(req, {
    action: 'order.status.updated',
    targetType: 'order',
    targetId: order.orderNumber,
    details: {
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
    },
  });
  res.status(200).json(ApiResponse.success('Order updated', { order: serializeOrder(order) }));
};
