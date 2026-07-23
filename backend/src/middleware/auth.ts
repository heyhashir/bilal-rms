import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { authRepository } from '../repositories/auth.repository';
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
    const [customerSession, adminSession] = await Promise.all([
      authRepository.findCustomerSessionByToken(token),
      authRepository.findAdminSessionByToken(token),
    ]);

    if (adminSession) {
      if (adminSession.expiresAt.getTime() <= Date.now() || !adminSession.account.isActive) {
        await authRepository.deleteAdminSessionsByToken(token);
        clearSessionCookie(res);
        res.setHeader('x-session-expired', '1');
        next();
        return;
      }

      req.currentUser = {
        id: adminSession.account.id,
        email: adminSession.account.email,
        name: adminSession.account.name,
        role: adminSession.account.role,
        kind: 'admin',
        isActive: adminSession.account.isActive,
      };

      next();
      return;
    }

    if (!customerSession || customerSession.expiresAt.getTime() <= Date.now() || !customerSession.user.isActive) {
      if (customerSession) {
        await authRepository.deleteSessionsByToken(token);
      }
      clearSessionCookie(res);
      res.setHeader('x-session-expired', '1');
      next();
      return;
    }

    req.currentUser = {
      id: customerSession.user.id,
      email: customerSession.user.email,
      name: customerSession.user.name,
      role: customerSession.user.role,
      kind: 'customer',
      isActive: customerSession.user.isActive,
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

export const requireCustomerAuth = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.currentUser || req.currentUser.kind !== 'customer') {
    next(new ApiError(401, 'Customer authentication required'));
    return;
  }

  next();
};

export const requireAdminPanelAuth = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.currentUser || req.currentUser.kind !== 'admin') {
    next(new ApiError(401, 'Admin authentication required'));
    return;
  }

  next();
};

export const requireAdminRoles =
  (roles: Array<'ADMIN' | 'MANAGER' | 'STAFF'>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.currentUser || req.currentUser.kind !== 'admin') {
      next(new ApiError(401, 'Admin authentication required'));
      return;
    }

    if (!roles.includes(req.currentUser.role as 'ADMIN' | 'MANAGER' | 'STAFF')) {
      next(new ApiError(403, 'You do not have permission to access this resource'));
      return;
    }

    next();
  };

export const requireAdmin = requireAdminRoles(['ADMIN']);
