import { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../types/ApiError';
import { clearSessionCookie } from '../utils/cookies';

const extractCookieToken = (req: Request): string | undefined => {
  const value = req.cookies?.[env.SESSION_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
};

export const attachSession = (req: Request, res: Response, next: NextFunction): void => {
  const token = extractCookieToken(req);
  req.sessionToken = token;
  req.currentUser = null;

  if (!token) {
    next();
    return;
  }

  void (async () => {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt.getTime() <= Date.now() || !session.user.isActive) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      clearSessionCookie(res);
      res.setHeader('x-session-expired', '1');
      next();
      return;
    }

    req.currentUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      isActive: session.user.isActive,
    };

    next();
  })().catch(next);
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.currentUser) {
    next(new ApiError(401, 'Authentication required'));
    return;
  }

  next();
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.currentUser || req.currentUser.role !== 'ADMIN') {
    next(new ApiError(403, 'Admin access required'));
    return;
  }

  next();
};
