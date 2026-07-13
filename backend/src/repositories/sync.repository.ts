import prisma from '../config/prisma';
import { productInclude } from './catalog.repository';

export const syncRepository = {
  registerDevice: (deviceKey: string, name: string, notes: string) =>
    prisma.registerDevice.upsert({
      where: { deviceKey },
      update: {
        name,
        notes,
        lastSeenAt: new Date(),
        lastSyncError: null,
      },
      create: {
        deviceKey,
        name,
        notes,
        lastSeenAt: new Date(),
        syncStatus: 'SYNCED',
        lastSyncError: null,
      },
    }),
  touchDevice: (deviceKey: string) =>
    prisma.registerDevice.upsert({
      where: { deviceKey },
      update: { lastSeenAt: new Date() },
      create: {
        deviceKey,
        name: deviceKey,
        lastSeenAt: new Date(),
      },
    }),
  findDeviceByKey: (deviceKey: string) =>
    prisma.registerDevice.findUnique({
      where: { deviceKey },
    }),
  findDuplicateJob: (params: {
    deviceId?: string | null;
    jobKey?: string | null;
    direction: string;
    entityType: string;
    entityId?: string | null;
  }) =>
    prisma.syncJob.findFirst({
      where: {
        OR: [
          params.jobKey
            ? {
                deviceId: params.deviceId ?? null,
                jobKey: params.jobKey,
              }
            : undefined,
          {
            deviceId: params.deviceId ?? null,
            direction: params.direction as never,
            entityType: params.entityType,
            entityId: params.entityId ?? null,
          },
        ].filter(Boolean) as never,
      },
      orderBy: { createdAt: 'desc' },
    }),
  listDevices: () =>
    prisma.registerDevice.findMany({
      orderBy: [{ lastSyncAt: 'desc' }, { createdAt: 'desc' }],
    }),
  listJobs: (limit = 100) =>
    prisma.syncJob.findMany({
      include: {
        device: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  findJobById: (id: string) =>
    prisma.syncJob.findUniqueOrThrow({
      where: { id },
      include: {
        device: true,
      },
    }),
  updateJobById: (
    id: string,
    data: {
      status?: 'PENDING' | 'SYNCED' | 'FAILED';
      lastError?: string | null;
      attempts?: number;
    },
  ) =>
    prisma.syncJob.update({
      where: { id },
      data,
      include: {
        device: true,
      },
    }),
  listActiveEmployees: () =>
    prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    }),
  listBootstrapProducts: () =>
    prisma.product.findMany({
      where: { isActive: true },
      include: productInclude,
      orderBy: { updatedAt: 'desc' },
    }),
  createSyncJob: (input: {
    deviceId?: string | null;
    jobKey?: string | null;
    direction: 'PUSH' | 'PULL';
    entityType: string;
    entityId?: string | null;
    payload: unknown;
    status: 'PENDING' | 'SYNCED' | 'FAILED';
    lastError?: string | null;
    attempts: number;
  }) =>
    prisma.syncJob.create({
      data: {
        deviceId: input.deviceId ?? null,
        jobKey: input.jobKey ?? null,
        direction: input.direction,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        payload: input.payload as never,
        status: input.status,
        lastError: input.lastError ?? null,
        attempts: input.attempts,
      },
    }),
  updateDeviceSyncState: (id: string, input: {
    syncStatus?: 'SYNCED' | 'FAILED' | 'PENDING';
    lastSeenAt?: Date;
    lastSyncAt?: Date;
    lastBootstrapAt?: Date;
    lastCursor?: string | null;
    lastSyncError?: string | null;
  }) =>
    prisma.registerDevice.update({
      where: { id },
      data: input,
    }),
};
