import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializePosSale } from '../../utils/serializers';
import { posService } from '../../services/pos.service';
import { logAdminAudit } from '../../utils/adminAudit';
import { buildListMeta, parseListQuery } from '../../utils/list-query';
import { toCsv } from '../../utils/csv';

export const listPosSales = async (req: Request, res: Response) => {
  const query = parseListQuery(req, { defaultSort: 'createdAt', defaultPageSize: 20 });
  const sales = await posService.listSales(query);
  res.status(200).json(
    ApiResponse.success('POS sales loaded', {
      sales: sales.items.map(serializePosSale),
      meta: buildListMeta(query, sales.total),
    }),
  );
};

export const getPosSale = async (req: Request, res: Response) => {
  const sale = await posService.getSale(req.params.saleNumber);
  res.status(200).json(ApiResponse.success('POS sale loaded', { sale: serializePosSale(sale) }));
};

export const createPosSale = async (req: Request, res: Response) => {
  const sale = await posService.createSale(req.body);
  logAdminAudit(req, {
    action: 'pos-sale.created',
    targetType: 'pos-sale',
    targetId: sale.saleNumber,
    details: {
      status: sale.status,
      total: Number(sale.total),
      itemCount: sale.items.length,
      syncedStatus: sale.syncedStatus,
    },
  });
  res.status(201).json(ApiResponse.success('POS sale saved', { sale: serializePosSale(sale) }));
};

export const refundPosSale = async (req: Request, res: Response) => {
  const sale = await posService.refundSale({
    saleNumber: req.params.saleNumber,
    ...req.body,
  });
  logAdminAudit(req, {
    action: 'pos-sale.refunded',
    targetType: 'pos-sale',
    targetId: sale.saleNumber,
    details: {
      status: sale.status,
      refundedItems: Array.isArray(req.body.items) ? req.body.items.length : 0,
      reason: typeof req.body.reason === 'string' ? req.body.reason : '',
    },
  });
  res.status(200).json(ApiResponse.success('POS refund processed', { sale: serializePosSale(sale) }));
};

export const markPosSaleReprint = async (req: Request, res: Response) => {
  const sale = await posService.recordReceiptReprint(req.params.saleNumber);
  res.status(200).json(ApiResponse.success('Receipt reprint recorded', { sale: serializePosSale(sale) }));
};

export const exportPosSales = async (req: Request, res: Response) => {
  const sales = await posService.listSalesForExport(
    typeof req.query.query === 'string' ? req.query.query.trim() : '',
  );

  const csv = toCsv(
    ['saleNumber', 'customerName', 'customerPhone', 'paymentMethod', 'status', 'syncedStatus', 'receiptNumber', 'invoiceNumber', 'total', 'createdAt'],
    sales.map((sale) => ({
      saleNumber: sale.saleNumber,
      customerName: sale.customerName ?? '',
      customerPhone: sale.customerPhone ?? '',
      paymentMethod: sale.paymentMethod ?? '',
      status: sale.status,
      syncedStatus: sale.syncedStatus,
      receiptNumber: sale.receipt?.receiptNumber ?? '',
      invoiceNumber: sale.receipt?.invoiceNumber ?? '',
      total: Number(sale.total),
      createdAt: sale.createdAt.toISOString(),
    })),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="pos-sales.csv"');
  res.status(200).send(csv);
};
