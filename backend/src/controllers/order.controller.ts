import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { serializeOrder, serializeReturnRequest } from '../utils/serializers';
import { orderService } from '../services/order.service';

export const checkoutOrder = async (req: Request, res: Response) => {
  const order = await orderService.checkout({
    input: req.body as never,
    userId: req.currentUser?.kind === 'customer' ? req.currentUser.id : null,
    paymentProof: req.file
      ? {
          path: req.file.path,
          originalname: req.file.originalname,
          mimetype: req.file.mimetype,
          size: req.file.size,
        }
      : null,
  });

  res.status(201).json(ApiResponse.success('Order placed successfully', { order: serializeOrder(order) }));
};

export const getOrder = async (req: Request, res: Response) => {
  const order = await orderService.getOrder(req.params.orderNumber);
  if (!order) {
    res.status(404).json(ApiResponse.error('Order not found'));
    return;
  }

  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const authorized =
    (req.currentUser?.kind === 'customer' && req.currentUser.id === order.userId) ||
    (token.length > 0 && token === order.publicToken);

  if (!authorized) {
    res.status(403).json(ApiResponse.error('Order access denied'));
    return;
  }

  res.status(200).json(ApiResponse.success('Order loaded', { order: serializeOrder(order) }));
};

export const trackOrder = async (req: Request, res: Response) => {
  const input = req.body as { orderNumber: string; email: string };
  const order = await orderService.trackOrder(input.orderNumber, input.email);

  if (!order) {
    res.status(404).json(ApiResponse.error('No matching order found'));
    return;
  }

  res.status(200).json(ApiResponse.success('Order loaded', { order: serializeOrder(order) }));
};

export const createReturn = async (req: Request, res: Response) => {
  const input = req.body as { reason: string; details?: string };
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const order = await orderService.getOrder(req.params.orderNumber);

  if (!order) {
    res.status(404).json(ApiResponse.error('Order not found'));
    return;
  }

  const authorized =
    (req.currentUser?.kind === 'customer' && req.currentUser.id === order.userId) ||
    (token.length > 0 && token === order.publicToken);
  if (!authorized) {
    res.status(403).json(ApiResponse.error('Order access denied'));
    return;
  }

  const { request } = await orderService.createReturn({
    orderNumber: req.params.orderNumber,
    userId: req.currentUser?.kind === 'customer' ? req.currentUser.id : null,
    reason: input.reason,
    details: input.details,
  });

  res.status(201).json(
    ApiResponse.success('Return request submitted', {
      request: serializeReturnRequest(request),
    }),
  );
};
