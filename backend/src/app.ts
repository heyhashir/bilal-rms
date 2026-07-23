import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Application, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env';
import { attachSession } from './middleware/auth';
import { requireApiCsrfHeader } from './middleware/csrf';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestId } from './middleware/requestId';
import { requestLogger } from './middleware/requestLogger';
import adminRoutes from './routes/admin.routes';
import authRoutes from './routes/auth.routes';
import catalogRoutes from './routes/catalog.routes';
import healthRoutes from './routes/health.routes';
import ordersRoutes from './routes/orders.routes';
import accountRoutes from './routes/account.routes';
import syncRoutes from './routes/sync.routes';
import logger from './utils/logger';
import { listCatalogCategories } from './controllers/catalog.controller';
import { asyncHandler } from './utils/asyncHandler';

const API_PREFIX = '/api/v1';

const createLimiter = (options: { windowMs: number; limit: number; message: string }) =>
  rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: options.message,
      data: null,
    },
    handler: (req, res, _next, opts) => {
      logger.warn('Rate limit exceeded', {
        path: req.originalUrl,
        ip: req.ip,
      });
      res.status(opts.statusCode).json(opts.message);
    },
  });

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(requestId);
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.isProduction ? env.APP_URL : true,
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(cookieParser());
  app.use(express.json({ limit: `${env.MAX_UPLOAD_MB}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.MAX_UPLOAD_MB}mb` }));
  app.use(requestLogger);

  app.use('/uploads', express.static(env.UPLOAD_DIR));
  app.use(attachSession);
  app.use(API_PREFIX, requireApiCsrfHeader);

  app.use(`${API_PREFIX}/health`, healthRoutes);
  app.use(
    `${API_PREFIX}/auth`,
    createLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 30,
      message: 'Too many authentication attempts, please try again later.',
    }),
    authRoutes,
  );
  app.use(`${API_PREFIX}/account`, accountRoutes);
  app.get(`${API_PREFIX}/categories`, asyncHandler(listCatalogCategories));
  app.use(`${API_PREFIX}/catalog`, catalogRoutes);
  app.use(
    `${API_PREFIX}/orders/checkout`,
    createLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 40,
      message: 'Too many uploads, please try again later.',
    }),
  );
  app.use(`${API_PREFIX}/orders`, ordersRoutes);
  app.use(
    `${API_PREFIX}/admin/uploads`,
    createLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 40,
      message: 'Too many uploads, please try again later.',
    }),
  );
  app.use(
    `${API_PREFIX}/admin/products/import`,
    createLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      message: 'Too many uploads, please try again later.',
    }),
  );
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(
    `${API_PREFIX}/sync`,
    createLimiter({
      windowMs: 15 * 60 * 1000,
      limit: 120,
      message: 'Too many sync requests, please try again later.',
    }),
    syncRoutes,
  );

  if (fs.existsSync(env.PUBLIC_DIR)) {
    app.use(express.static(env.PUBLIC_DIR));

    app.get(/^(?!\/api\/).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(env.PUBLIC_DIR, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
