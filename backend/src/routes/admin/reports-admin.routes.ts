import { Router } from 'express';
import { getReportSummary } from '../../controllers/admin/report.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/reports/summary', asyncHandler(getReportSummary));

export default router;
