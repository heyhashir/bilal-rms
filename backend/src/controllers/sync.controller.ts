import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { serializeEmployee, serializeProduct, serializeSettings } from '../utils/serializers';
import { syncService } from '../services/sync.service';

export const registerSyncDevice = async (req: Request, res: Response) => {
  const input = req.body as { deviceKey: string; name: string; notes?: string };
  const device = await syncService.registerDevice(input.deviceKey, input.name, input.notes || '');

  res.status(201).json(
    ApiResponse.success('Device registered', {
      device: {
        id: device.id,
        name: device.name,
        deviceKey: device.deviceKey,
        syncStatus: device.syncStatus.toLowerCase(),
        lastSeenAt: device.lastSeenAt?.getTime() ?? null,
        lastSyncAt: device.lastSyncAt?.getTime() ?? null,
        lastBootstrapAt: device.lastBootstrapAt?.getTime() ?? null,
        lastCursor: device.lastCursor ?? null,
        lastSyncError: device.lastSyncError ?? '',
      },
    }),
  );
};

export const bootstrapSync = async (req: Request, res: Response) => {
  const deviceKey = typeof req.query.deviceKey === 'string' ? req.query.deviceKey : '';
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
  const payload = await syncService.bootstrap(deviceKey, cursor);

  res.status(200).json(
    ApiResponse.success('Sync bootstrap loaded', {
      settings: serializeSettings(payload.settings),
      products: payload.products.map(serializeProduct),
      employees: payload.employees.map(serializeEmployee),
      cursor: payload.cursor,
      requestedCursor: payload.requestedCursor,
      changed: payload.changed,
    }),
  );
};

export const pushSyncJobs = async (req: Request, res: Response) => {
  const payload = await syncService.pushJobs(req.body);
  res.status(201).json(
    ApiResponse.success('Sync jobs recorded', {
      count: payload.length,
    }),
  );
};
