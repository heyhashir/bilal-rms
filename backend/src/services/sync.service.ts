import { settingsRepository } from '../repositories/settings.repository';
import { syncRepository } from '../repositories/sync.repository';

const computeCursor = (input: {
  settingsUpdatedAt: Date;
  employeeUpdatedAts: Date[];
  productUpdatedAts: Date[];
}) =>
  String(
    [
      input.settingsUpdatedAt.getTime(),
      ...input.employeeUpdatedAts.map((value) => value.getTime()),
      ...input.productUpdatedAts.map((value) => value.getTime()),
    ].reduce((max, value) => Math.max(max, value), 0),
  );

export const syncService = {
  registerDevice(deviceKey: string, name: string, notes: string) {
    return syncRepository.registerDevice(deviceKey, name, notes);
  },
  async bootstrap(deviceKey: string, requestedCursor?: string) {
    const device = deviceKey ? await syncRepository.touchDevice(deviceKey) : null;

    const [settings, employees, detailedProducts] = await Promise.all([
      settingsRepository.getSettings(),
      syncRepository.listActiveEmployees(),
      syncRepository.listBootstrapProducts(),
    ]);

    const cursor = computeCursor({
      settingsUpdatedAt: settings.updatedAt,
      employeeUpdatedAts: employees.map((employee) => employee.updatedAt),
      productUpdatedAts: detailedProducts.map((product) => product.updatedAt),
    });

    if (device) {
      await syncRepository.updateDeviceSyncState(device.id, {
        syncStatus: 'SYNCED',
        lastSeenAt: new Date(),
        lastBootstrapAt: new Date(),
        lastCursor: cursor,
        lastSyncError: null,
      });
    }

    return {
      settings,
      products: detailedProducts,
      employees,
      cursor,
      requestedCursor: requestedCursor ?? null,
      changed: requestedCursor ? requestedCursor !== cursor : true,
    };
  },
  async pushJobs(input: {
    deviceKey: string;
    cursor?: string;
    jobs: Array<{
      jobKey: string;
      direction: string;
      entityType: string;
      entityId?: string | null;
      payload: unknown;
      status: string;
      error?: string;
    }>;
  }) {
    const device = await syncRepository.findDeviceByKey(input.deviceKey);
    const createdJobs = [];

    for (const job of input.jobs) {
      const duplicate = await syncRepository.findDuplicateJob({
        deviceId: device?.id ?? null,
        jobKey: job.jobKey,
        direction: job.direction.toUpperCase(),
        entityType: job.entityType,
        entityId: job.entityId ?? null,
      });

      if (duplicate) {
        continue;
      }

      createdJobs.push(
        await syncRepository.createSyncJob({
          deviceId: device?.id ?? null,
          jobKey: job.jobKey,
          direction: job.direction.toUpperCase() as 'PUSH' | 'PULL',
          entityType: job.entityType,
          entityId: job.entityId || null,
          payload: job.payload,
          status: job.status.toUpperCase() as 'PENDING' | 'SYNCED' | 'FAILED',
          lastError: job.error || null,
          attempts: job.status === 'failed' ? 1 : 0,
        }),
      );
    }

    if (device) {
      const firstFailure = createdJobs.find((job) => job.status === 'FAILED');
      await syncRepository.updateDeviceSyncState(device.id, {
        syncStatus:
          createdJobs.length === 0 ? device.syncStatus : createdJobs.some((job) => job.status === 'FAILED') ? 'FAILED' : 'SYNCED',
        lastSeenAt: new Date(),
        lastSyncAt: new Date(),
        lastCursor: input.cursor ?? device.lastCursor ?? null,
        lastSyncError: firstFailure?.lastError ?? null,
      });
    }

    return createdJobs;
  },
  async getDiagnostics() {
    const [devices, jobs] = await Promise.all([
      syncRepository.listDevices(),
      syncRepository.listJobs(),
    ]);

    const deviceSummaries = devices.map((device) => {
      const deviceJobs = jobs.filter((job) => job.deviceId === device.id);
      const pendingJobs = deviceJobs.filter((job) => job.status === 'PENDING').length;
      const failedJobs = deviceJobs.filter((job) => job.status === 'FAILED').length;
      const retryCount = deviceJobs.reduce((sum, job) => sum + job.attempts, 0);

      return {
        ...device,
        pendingJobs,
        failedJobs,
        retryCount,
      };
    });

    return {
      summary: {
        devices: devices.length,
        failedDevices: devices.filter((device) => device.syncStatus === 'FAILED').length,
        pendingJobs: jobs.filter((job) => job.status === 'PENDING').length,
        failedJobs: jobs.filter((job) => job.status === 'FAILED').length,
        lastSyncAt:
          devices
            .map((device) => device.lastSyncAt?.getTime() ?? 0)
            .reduce((max, value) => Math.max(max, value), 0) || null,
      },
      devices: deviceSummaries,
      jobs,
    };
  },
  async retryJob(jobId: string) {
    const job = await syncRepository.findJobById(jobId);
    const nextJob = await syncRepository.updateJobById(job.id, {
      status: 'PENDING',
      lastError: null,
      attempts: job.attempts + 1,
    });

    if (job.deviceId) {
      await syncRepository.updateDeviceSyncState(job.deviceId, {
        syncStatus: 'PENDING',
        lastSeenAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncError: null,
      });
    }

    return nextJob;
  },
  async resolveJob(jobId: string) {
    const job = await syncRepository.findJobById(jobId);
    const nextJob = await syncRepository.updateJobById(job.id, {
      status: 'SYNCED',
      lastError: null,
    });

    if (job.deviceId) {
      const allJobs = await syncRepository.listJobs(500);
      const remainingFailed = allJobs.some((entry) => entry.deviceId === job.deviceId && entry.id !== job.id && entry.status === 'FAILED');
      await syncRepository.updateDeviceSyncState(job.deviceId, {
        syncStatus: remainingFailed ? 'FAILED' : 'SYNCED',
        lastSeenAt: new Date(),
        lastSyncAt: new Date(),
        lastSyncError: remainingFailed ? job.lastError ?? null : null,
      });
    }

    return nextJob;
  },
};
