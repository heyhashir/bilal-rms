import { Router } from 'express';
import { requireAdminPanelAuth, requireAdminRoles } from '../middleware/auth';
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

router.use(requireAdminPanelAuth);

router.use(requireAdminRoles(['ADMIN', 'MANAGER']), coreAdminRoutes);
router.use(requireAdminRoles(['ADMIN', 'MANAGER', 'STAFF']), catalogAdminRoutes);
router.use(requireAdminRoles(['ADMIN', 'MANAGER']), peopleAdminRoutes);
router.use(requireAdminRoles(['ADMIN', 'MANAGER']), ordersAdminRoutes);
router.use(requireAdminRoles(['ADMIN', 'MANAGER']), inventoryAdminRoutes);
router.use(requireAdminRoles(['ADMIN', 'MANAGER', 'STAFF']), posAdminRoutes);
router.use(requireAdminRoles(['ADMIN']), commissionsAdminRoutes);
router.use(requireAdminRoles(['ADMIN']), reportsAdminRoutes);
router.use(requireAdminRoles(['ADMIN']), settingsAdminRoutes);
router.use(requireAdminRoles(['ADMIN']), syncAdminRoutes);

export default router;
