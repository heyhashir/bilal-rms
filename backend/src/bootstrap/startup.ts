import fs from 'fs';
import path from 'path';
import prisma from '../config/prisma';
import { env } from '../config/env';
import { ensureRuntimeDirectories } from '../utils/files';
import logger from '../utils/logger';

const assertWritableDirectory = (directory: string): void => {
  fs.mkdirSync(directory, { recursive: true });
  fs.accessSync(directory, fs.constants.R_OK | fs.constants.W_OK);
};

export const ensureStartupReadiness = async (): Promise<void> => {
  logger.info('Running startup readiness checks');

  ensureRuntimeDirectories();

  const indexHtmlPath = path.join(env.PUBLIC_DIR, 'index.html');
  if (env.isProduction && !fs.existsSync(env.PUBLIC_DIR)) {
    throw new Error(`Built frontend assets were not found at "${env.PUBLIC_DIR}". Run "npm run build" before starting the app.`);
  }

  if (env.isProduction && !fs.existsSync(indexHtmlPath)) {
    throw new Error(`Missing frontend entrypoint at "${indexHtmlPath}". Run "npm run build" before starting the app.`);
  }

  const uploadDirectories = [
    env.UPLOAD_DIR,
    path.join(env.UPLOAD_DIR, 'products'),
    path.join(env.UPLOAD_DIR, 'payments'),
    env.IMPORT_DIR,
  ];

  uploadDirectories.forEach(assertWritableDirectory);

  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;

  const migrationRows = (await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(
    'SELECT migration_name FROM _prisma_migrations ORDER BY finished_at DESC',
  )) as Array<{ migration_name: string }>;

  if (migrationRows.length === 0) {
    throw new Error('No Prisma migrations have been applied. Run "npm run db:prepare" before starting the app.');
  }

  logger.info('Startup readiness checks passed', {
    migrationCount: migrationRows.length,
    uploadDir: env.UPLOAD_DIR,
    publicDir: env.PUBLIC_DIR,
    indexHtmlPath,
  });
};

export const verifySeedState = async (): Promise<void> => {
  const [settingsCount, adminCount, registerCount] = await Promise.all([
    prisma.storeSetting.count(),
    prisma.user.count({
      where: {
        email: env.ADMIN_EMAIL,
        role: 'ADMIN',
      },
    }),
    prisma.registerDevice.count({
      where: { deviceKey: 'hostinger-web' },
    }),
  ]);

  if (settingsCount === 0) {
    throw new Error('Store settings seed is missing.');
  }

  if (adminCount === 0) {
    throw new Error(`Seed admin account "${env.ADMIN_EMAIL}" is missing.`);
  }

  if (registerCount === 0) {
    throw new Error('Default register device seed is missing.');
  }

  logger.info('Seed state verified', {
    settingsCount,
    adminEmail: env.ADMIN_EMAIL,
    registerCount,
  });
};
