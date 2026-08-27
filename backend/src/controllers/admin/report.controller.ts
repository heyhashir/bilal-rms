import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { reportService } from '../../services/report.service';
import { toCsv } from '../../utils/csv';

export const getReportSummary = async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  const summary = await reportService.getSummary({ from, to });

  res.status(200).json(ApiResponse.success('Report summary loaded', { summary }));
};

export const getBillWiseReport = async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : undefined;
  const cashier = typeof req.query.cashier === 'string' && req.query.cashier ? req.query.cashier : undefined;
  const paymentMethod = typeof req.query.paymentMethod === 'string' && req.query.paymentMethod ? req.query.paymentMethod : undefined;
  const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
  const query = typeof req.query.query === 'string' && req.query.query ? req.query.query.trim() : undefined;

  const data = await reportService.getBillWiseReport({
    from,
    to,
    cashier,
    paymentMethod,
    type,
    query,
  });

  res.status(200).json(ApiResponse.success('Bill-wise report loaded', data));
};

export const exportBillWiseReport = async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' && req.query.from ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' && req.query.to ? req.query.to : undefined;
  const cashier = typeof req.query.cashier === 'string' && req.query.cashier ? req.query.cashier : undefined;
  const paymentMethod = typeof req.query.paymentMethod === 'string' && req.query.paymentMethod ? req.query.paymentMethod : undefined;
  const type = typeof req.query.type === 'string' && req.query.type ? req.query.type : undefined;
  const query = typeof req.query.query === 'string' && req.query.query ? req.query.query.trim() : undefined;

  const rows = await reportService.getBillWiseReportForExport({
    from,
    to,
    cashier,
    paymentMethod,
    type,
    query,
  });

  const headers = ['Date', 'Time', 'Receipt #', 'Receipt Type', 'Cashier', 'Payment Method', 'Qty Sold', 'Total (PKR)', 'Customer Name', 'Customer Phone'];
  const csv = toCsv(headers, rows);
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bill-wise-report-${dateStr}.csv"`);
  res.status(200).send(csv);
};
