import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import catalogAdminRoutes from './admin/catalog-admin.routes';
import commissionsAdminRoutes from './admin/commissions-admin.routes';
import coreAdminRoutes from './admin/core-admin.routes';
import inventoryAdminRoutes from './admin/inventory-admin.routes';
import ordersAdminRoutes from './admin/orders-admin.routes';
import peopleAdminRoutes from './admin/people-admin.routes';
import posAdminRoutes from './admin/pos-admin.routes';
import reportsAdminRoutes from './admin/reports-admin.routes';
import settingsAdminRoutes from './admin/settings-admin.routes';
import syncAdminRoutes from './admin/sync-admin.routes';

const router = Router();

router.use(requireAdmin);
router.use(coreAdminRoutes);
router.use(catalogAdminRoutes);
router.use(peopleAdminRoutes);
router.use(ordersAdminRoutes);
router.use(inventoryAdminRoutes);
router.use(posAdminRoutes);
router.use(commissionsAdminRoutes);
router.use(reportsAdminRoutes);
router.use(settingsAdminRoutes);
router.use(syncAdminRoutes);

export default router;
