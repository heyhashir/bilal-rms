import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export const ensureRuntimeDirectories = (): void => {
  const paths = [
    env.UPLOAD_DIR,
    path.join(env.UPLOAD_DIR, 'products'),
    path.join(env.UPLOAD_DIR, 'payments'),
    path.join(env.UPLOAD_DIR, 'videos'),
    env.IMPORT_DIR,
    path.join(process.cwd(), 'logs'),
  ];

  paths.forEach((target) => {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }
  });
};

export const toPublicUploadPath = (absolutePath: string): string => {
  const relative = path.relative(env.UPLOAD_DIR, absolutePath).replace(/\\/g, '/');
  return `/uploads/${relative}`;
};
