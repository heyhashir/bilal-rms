import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { reportService } from '../../services/report.service';

export const getReportSummary = async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  const summary = await reportService.getSummary({ from, to });

  res.status(200).json(ApiResponse.success('Report summary loaded', { summary }));
};
