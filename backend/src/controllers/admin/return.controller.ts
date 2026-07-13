import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializeReturnRequest } from '../../utils/serializers';
import { orderService } from '../../services/order.service';
import { logAdminAudit } from '../../utils/adminAudit';

export const listReturns = async (_req: Request, res: Response) => {
  const returns = await orderService.listAdminReturns();
  res.status(200).json(ApiResponse.success('Returns loaded', { returns: returns.map(serializeReturnRequest) }));
};

export const updateReturn = async (req: Request, res: Response) => {
  const input = req.body as {
    status: 'requested' | 'approved' | 'rejected' | 'refunded';
    refundAmount?: number | null;
    note?: string;
  };

  const request = await orderService.updateReturnStatus({
    returnRequestId: req.params.id,
    status: input.status,
    refundAmount: input.refundAmount ?? null,
    note: input.note || '',
  });

  logAdminAudit(req, {
    action: 'return.updated',
    targetType: 'return-request',
    targetId: request.id,
    details: {
      status: request.status,
      refundAmount: request.refundAmount ? Number(request.refundAmount) : null,
    },
  });

  res.status(200).json(
    ApiResponse.success('Return updated', {
      request: serializeReturnRequest(request),
    }),
  );
};
