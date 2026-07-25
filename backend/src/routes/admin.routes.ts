import { NextFunction, Request, Response, Router } from 'express';
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

const mountProtected = (
  child: Router,
  roles: Array<'ADMIN' | 'MANAGER' | 'STAFF'>,
  prefixes: string[],
) => {
  router.use((req: Request, res: Response, next: NextFunction) => {
    const matches = prefixes.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
    if (!matches) {
      next();
      return;
    }

    requireAdminRoles(roles)(req, res, next);
  });
  router.use(child);
};

router.use(requireAdminPanelAuth);

mountProtected(coreAdminRoutes, ['ADMIN', 'MANAGER'], ['/bootstrap', '/dashboard']);
mountProtected(catalogAdminRoutes, ['ADMIN', 'MANAGER', 'STAFF'], ['/products', '/categories', '/brands', '/barcodes', '/uploads']);
mountProtected(peopleAdminRoutes, ['ADMIN', 'MANAGER'], ['/customers', '/employees', '/staff-accounts']);
mountProtected(ordersAdminRoutes, ['ADMIN', 'MANAGER'], ['/orders', '/returns']);
mountProtected(inventoryAdminRoutes, ['ADMIN', 'MANAGER'], ['/inventory']);
mountProtected(posAdminRoutes, ['ADMIN', 'MANAGER', 'STAFF'], ['/pos-sales']);
mountProtected(commissionsAdminRoutes, ['ADMIN'], ['/commissions']);
mountProtected(reportsAdminRoutes, ['ADMIN'], ['/reports', '/vendors', '/vendor-purchases', '/ledger']);
mountProtected(settingsAdminRoutes, ['ADMIN'], ['/settings', '/shipping-zones']);
mountProtected(syncAdminRoutes, ['ADMIN'], ['/sync-diagnostics']);

export default router;
