import compression from 'compression';
import cors from 'cors';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { requestId } from './middleware/requestId';
import healthRoutes from './routes/health.routes';
import logger from './utils/logger';

const API_PREFIX = '/api/v1';

const morganStream = {
  write: (message: string): void => {
    logger.info(message.trim());
  },
};

export const createApp = (): Application => {
  const app = express();

  app.disable('x-powered-by');

  app.use(requestId);
  app.use(helmet());
  app.use(cors());
  app.use(compression());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(env.isProduction ? 'combined' : 'dev', { stream: morganStream }));

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  app.use(`${API_PREFIX}/health`, healthRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
