import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { syncService } from '../../services/sync.service';

export const getSyncDiagnostics = async (_req: Request, res: Response) => {
  const diagnostics = await syncService.getDiagnostics();

  res.status(200).json(
    ApiResponse.success('Sync diagnostics loaded', {
      summary: diagnostics.summary,
      devices: diagnostics.devices.map((device) => ({
        id: device.id,
        name: device.name,
        deviceKey: device.deviceKey,
        syncStatus: device.syncStatus.toLowerCase(),
        lastSeenAt: device.lastSeenAt?.getTime() ?? null,
        lastSyncAt: device.lastSyncAt?.getTime() ?? null,
        lastBootstrapAt: device.lastBootstrapAt?.getTime() ?? null,
        lastCursor: device.lastCursor ?? null,
        lastSyncError: device.lastSyncError ?? '',
        pendingJobs: device.pendingJobs,
        failedJobs: device.failedJobs,
        retryCount: device.retryCount,
        notes: device.notes,
        createdAt: device.createdAt.getTime(),
      })),
      jobs: diagnostics.jobs.map((job) => ({
        id: job.id,
        deviceId: job.deviceId,
        deviceName: job.device?.name ?? '',
        direction: job.direction.toLowerCase(),
        entityType: job.entityType,
        entityId: job.entityId,
        jobKey: job.jobKey ?? '',
        status: job.status.toLowerCase(),
        attempts: job.attempts,
        lastError: job.lastError ?? '',
        createdAt: job.createdAt.getTime(),
        updatedAt: job.updatedAt.getTime(),
      })),
    }),
  );
};

export const retrySyncJob = async (req: Request, res: Response) => {
  const job = await syncService.retryJob(req.params.id);
  res.status(200).json(
    ApiResponse.success('Sync job moved back to pending', {
      job: {
        id: job.id,
        status: job.status.toLowerCase(),
        attempts: job.attempts,
        lastError: job.lastError ?? '',
      },
    }),
  );
};

export const resolveSyncJob = async (req: Request, res: Response) => {
  const job = await syncService.resolveJob(req.params.id);
  res.status(200).json(
    ApiResponse.success('Sync job marked resolved', {
      job: {
        id: job.id,
        status: job.status.toLowerCase(),
        attempts: job.attempts,
        lastError: job.lastError ?? '',
      },
    }),
  );
};
