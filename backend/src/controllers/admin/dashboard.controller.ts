import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { dashboardService } from '../../services/dashboard.service';

export const getDashboard = async (_req: Request, res: Response) => {
  const dashboard = await dashboardService.getStats();
  res.status(200).json(ApiResponse.success('Dashboard loaded', { dashboard }));
};
