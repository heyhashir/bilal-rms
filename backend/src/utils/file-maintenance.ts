import fs from 'fs/promises';
import path from 'path';
import { env } from '../config/env';

const tryResolveUploadPath = (publicPath: string): string | null => {
  if (!publicPath.startsWith('/uploads/')) {
    return null;
  }

  const relativePath = publicPath.replace('/uploads/', '');
  const absolutePath = path.resolve(env.UPLOAD_DIR, relativePath);
  const relative = path.relative(env.UPLOAD_DIR, absolutePath);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }

  return absolutePath;
};

export const deleteUploadIfManaged = async (publicPath?: string | null): Promise<void> => {
  if (!publicPath) {
    return;
  }

  const absolutePath = tryResolveUploadPath(publicPath);
  if (!absolutePath) {
    return;
  }

  await fs.rm(absolutePath, { force: true }).catch(() => undefined);
};

export const collectMissingManagedFiles = async (publicPaths: string[]): Promise<string[]> => {
  const missing: string[] = [];

  for (const publicPath of publicPaths) {
    const absolutePath = tryResolveUploadPath(publicPath);
    if (!absolutePath) {
      continue;
    }

    const exists = await fs
      .access(absolutePath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      missing.push(publicPath);
    }
  }

  return missing;
};
