import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { ApiResponse } from '../utils/ApiResponse';
import { clearSessionCookie, setSessionCookie } from '../utils/cookies';
import { serializeAuthPrincipal, serializeUser } from '../utils/serializers';

export const getCurrentUser = async (req: Request, res: Response) => {
  if (!req.currentUser) {
    res.status(200).json(ApiResponse.success('Guest session', { user: null }));
    return;
  }

  if (req.currentUser.kind === 'admin') {
    const account = await authService.getCurrentAdminAccount(req.currentUser.id);
    res.status(200).json(ApiResponse.success('Current user loaded', { user: serializeAuthPrincipal(account) }));
    return;
  }

  const user = await authService.getCurrentCustomer(req.currentUser.id);
  res.status(200).json(ApiResponse.success('Current user loaded', { user: serializeUser(user) }));
};

export const registerUser = async (req: Request, res: Response) => {
  const input = req.body as { email: string; name: string; password: string };
  const { user, token, expiresAt } = await authService.register(input);

  setSessionCookie(res, token, expiresAt);
  res.status(201).json(ApiResponse.success('Account created', { user: serializeUser(user) }));
};

export const loginUser = async (req: Request, res: Response) => {
  const input = req.body as { email: string; password: string };
  const { principal, token, expiresAt } = await authService.login({
    ...input,
    currentSessionToken: req.sessionToken,
  });

  setSessionCookie(res, token, expiresAt);
  res.status(200).json(ApiResponse.success('Logged in', { user: serializeAuthPrincipal(principal) }));
};

export const logoutUser = async (req: Request, res: Response) => {
  await authService.logout(req.sessionToken);
  clearSessionCookie(res);
  res.status(200).json(ApiResponse.success('Logged out', { ok: true }));
};
