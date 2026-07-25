import { bootstrapData } from './bootstrap/seed';
import { ensureStartupReadiness, verifySeedState } from './bootstrap/startup';
import { createApp } from './app';
import { env } from './config/env';
import prisma from './config/prisma';
import logger from './utils/logger';

const STARTUP_RETRY_DELAY_MS = 5_000;

const registerProcessHandlers = (shutdown: (signal: string) => Promise<void>): void => {
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason });
    void prisma.$disconnect().finally(() => {
      process.exit(1);
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error });
    void prisma.$disconnect().finally(() => {
      process.exit(1);
    });
  });
};

const startReadinessWorker = (): void => {
  const initialize = async (): Promise<void> => {
    try {
      await ensureStartupReadiness();
      await bootstrapData();
      await verifySeedState();
      logger.info('Startup initialization completed.');
    } catch (error) {
      // The production launcher applies migrations concurrently so the web
      // process can satisfy Hostinger's short listen deadline. Retry until the
      // database and migration state are ready rather than terminating Express.
      logger.error('Startup initialization is not ready; retrying shortly.', { error });
      setTimeout(() => {
        void initialize();
      }, STARTUP_RETRY_DELAY_MS);
    }
  };

  void initialize();
};

const startServer = (): void => {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Bilal RMS Backend listening on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      try {
        await prisma.$disconnect();
        logger.info('Shutdown complete.');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    });
  };

  registerProcessHandlers(shutdown);
  startReadinessWorker();
};

try {
  startServer();
} catch (error) {
  logger.error('Startup failed', { error });
  void prisma.$disconnect().finally(() => {
    process.exit(1);
  });
}
