import path from 'path';
import winston from 'winston';
import { env } from '../config/env';

const logsDir = path.join(process.cwd(), 'logs');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, requestId, ...meta }) => {
    const reqIdPart = requestId ? ` [${requestId}]` : '';
    const metaKeys = Object.keys(meta).filter((key) => key !== 'stack');
    const metaPart = metaKeys.length > 0 ? ` ${JSON.stringify(meta)}` : '';
    const stackPart = meta.stack ? `\n${meta.stack}` : '';
    return `${timestamp} ${level}${reqIdPart}: ${message}${metaPart}${stackPart}`;
  }),
);

const logger = winston.createLogger({
  level: env.isProduction ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'bilal-rms-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') }),
  ],
});

if (!env.isProduction) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    }),
  );
}

export default logger;
