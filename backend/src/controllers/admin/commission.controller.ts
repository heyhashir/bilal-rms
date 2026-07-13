import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializeCommissionEntry } from '../../utils/serializers';
import { commissionService } from '../../services/commission.service';
import { logAdminAudit } from '../../utils/adminAudit';
import { buildListMeta, parseListQuery } from '../../utils/list-query';
import { toCsv } from '../../utils/csv';

export const listCommissions = async (req: Request, res: Response) => {
  const query = parseListQuery(req, { defaultSort: 'createdAt', defaultPageSize: 20 });
  const commissions = await commissionService.listCommissions(query);
  res.status(200).json(
    ApiResponse.success('Commissions loaded', {
      commissions: commissions.items.map(serializeCommissionEntry),
      meta: buildListMeta(query, commissions.total),
    }),
  );
};

export const exportCommissions = async (req: Request, res: Response) => {
  const commissions = await commissionService.listCommissionsForExport(
    typeof req.query.query === 'string' ? req.query.query.trim() : '',
  );

  const csv = toCsv(
    ['employee', 'saleNumber', 'product', 'qty', 'refundedQty', 'rate', 'amount', 'status', 'note', 'createdAt'],
    commissions.map((entry) => ({
      employee: entry.employee.name,
      saleNumber: entry.sale.saleNumber,
      product: entry.saleItem.name,
      qty: entry.saleItem.qty,
      refundedQty: entry.saleItem.refundedQty,
      rate: Number(entry.rate),
      amount: Number(entry.amount),
      status: entry.status,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="commissions.csv"');
  res.status(200).send(csv);
};

export const updateCommission = async (req: Request, res: Response) => {
  const { status, note } = req.body as { status: string; note?: string };
  const commission = await commissionService.updateCommissionStatus(req.params.id, status.toUpperCase(), note || '');
  logAdminAudit(req, {
    action: 'commission.updated',
    targetType: 'commission-entry',
    targetId: commission.id,
    details: {
      status: commission.status,
      note: commission.note ?? '',
      amount: Number(commission.amount),
    },
  });
  res.status(200).json(
    ApiResponse.success('Commission updated', {
      commission: serializeCommissionEntry(commission),
    }),
  );
};
