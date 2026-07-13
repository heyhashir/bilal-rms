import { Router } from 'express';
import {
  getSyncDiagnostics as getSyncDiagnosticsController,
  resolveSyncJob as resolveSyncJobController,
  retrySyncJob as retrySyncJobController,
} from '../../controllers/admin/sync.controller';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

router.get('/sync-diagnostics', asyncHandler(getSyncDiagnosticsController));
router.post('/sync-jobs/:id/retry', asyncHandler(retrySyncJobController));
router.post('/sync-jobs/:id/resolve', asyncHandler(resolveSyncJobController));

export default router;
