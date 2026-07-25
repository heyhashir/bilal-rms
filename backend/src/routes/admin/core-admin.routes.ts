import { Router } from 'express';
import { getBootstrap as getBootstrapController } from '../../controllers/admin/bootstrap.controller';
import { getDashboard as getDashboardController } from '../../controllers/admin/dashboard.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();


router.get('/bootstrap', asyncHandler(getBootstrapController));

router.get('/dashboard', asyncHandler(getDashboardController));

export default router;
