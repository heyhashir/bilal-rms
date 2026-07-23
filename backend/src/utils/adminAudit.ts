import { Request } from 'express';
import logger from './logger';

type AdminAuditInput = {
  action: string;
  targetType: string;
  targetId?: string | null;
  details?: Record<string, unknown>;
};

export const logAdminAudit = (req: Request, input: AdminAuditInput): void => {
  const actor = req.currentUser;
  if (!actor) {
    return;
  }

  logger.info('Admin mutation recorded', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    details: input.details ?? {},
  });
};
