import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { z } from 'zod';

const cwd = process.cwd();
const rootDir = fs.existsSync(path.resolve(cwd, 'backend')) ? cwd : path.resolve(cwd, '..');
const externallyProvidedEnv = new Set(Object.keys(process.env));

const envCandidates = [
  path.resolve(rootDir, '.env'),
  path.resolve(rootDir, 'backend/.env'),
  path.resolve(rootDir, 'backend/.env.local'),
];

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    const parsed = dotenv.parse(fs.readFileSync(candidate));
    for (const [key, value] of Object.entries(parsed)) {
      if (!externallyProvidedEnv.has(key)) {
        process.env[key] = value;
      }
    }
  }
}

if (!process.env.DATABASE_URL) {
  const localExample = path.resolve(rootDir, 'backend/.env.local.example');
  const localTarget = path.resolve(rootDir, 'backend/.env.local');

  // eslint-disable-next-line no-console
  console.error(
    [
      'DATABASE_URL is missing.',
      `Create ${localTarget} from ${localExample} and start the local MariaDB stack with "npm run db:up".`,
      'Then run "npm run db:prepare" before starting the app.',
    ].join('\n'),
  );
}

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:5000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_COOKIE_NAME: z.string().min(1).default('bilal_rms_session'),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  UPLOAD_DIR: z.string().min(1).default('backend/uploads'),
  IMPORT_DIR: z.string().min(1).default('backend/runtime-imports'),
  PUBLIC_DIR: z.string().min(1).default('backend/public'),
  MAX_UPLOAD_MB: z.coerce.number().positive().default(10),
  ADMIN_EMAIL: z.string().email().default('admin@bilalgarments.pk'),
  ADMIN_PASSWORD: z.string().min(8).default('admin123'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

const appUrl = new URL(parsedEnv.data.APP_URL);
const normalizedAppUrl = appUrl.origin;

if (parsedEnv.data.NODE_ENV === 'production') {
  if (appUrl.protocol !== 'https:') {
    throw new Error('APP_URL must use https in production');
  }

  if (['localhost', '127.0.0.1'].includes(appUrl.hostname)) {
    throw new Error('APP_URL cannot point to localhost in production');
  }

  if (parsedEnv.data.ADMIN_PASSWORD === 'admin123') {
    throw new Error('ADMIN_PASSWORD must be changed from the default value in production');
  }
}

export const env = {
  ...parsedEnv.data,
  APP_URL: normalizedAppUrl,
  UPLOAD_DIR: path.resolve(rootDir, parsedEnv.data.UPLOAD_DIR),
  IMPORT_DIR: path.resolve(rootDir, parsedEnv.data.IMPORT_DIR),
  PUBLIC_DIR: path.resolve(rootDir, parsedEnv.data.PUBLIC_DIR),
  isProduction: parsedEnv.data.NODE_ENV === 'production',
  isDevelopment: parsedEnv.data.NODE_ENV === 'development',
  isTest: parsedEnv.data.NODE_ENV === 'test',
};
