import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { authRepository } from '../repositories/auth.repository';
import { ApiError } from '../types/ApiError';
import { createSessionToken } from '../utils/cookies';

const sessionExpiry = () => new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

export const authService = {
  getCurrentCustomer(userId: string) {
    return authRepository.findUserProfile(userId);
  },
  getCurrentAdminAccount(accountId: string) {
    return authRepository.findAdminAccountById(accountId);
  },
  async register(input: { email: string; name: string; password: string }) {
    const email = input.email.toLowerCase();
    const exists = await authRepository.findUserByEmail(email);

    if (exists) {
      throw new ApiError(409, 'Email already registered');
    }

    const user = await authRepository.createUser({
      email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 12),
    });

    const token = createSessionToken();
    const expiresAt = sessionExpiry();

    await authRepository.createSession({
      token,
      userId: user.id,
      expiresAt,
    });

    return { user, token, expiresAt };
  },
  async login(input: { email: string; password: string; currentSessionToken?: string }) {
    if (input.currentSessionToken) {
      await authRepository.deleteSessionsByToken(input.currentSessionToken);
      await authRepository.deleteAdminSessionsByToken(input.currentSessionToken);
    }

    const normalizedEmail = input.email.toLowerCase();
    const adminAccount = await authRepository.findAdminAccountByEmail(normalizedEmail);
    if (adminAccount && adminAccount.isActive) {
      const valid = await bcrypt.compare(input.password, adminAccount.passwordHash);
      if (!valid) {
        throw new ApiError(401, 'Invalid credentials');
      }

      const token = createSessionToken();
      const expiresAt = sessionExpiry();

      await authRepository.createAdminSession({
        token,
        accountId: adminAccount.id,
        expiresAt,
      });
      await authRepository.updateAdminAccount(adminAccount.id, {
        lastLoginAt: new Date(),
      });

      return { principal: adminAccount, token, expiresAt, kind: 'admin' as const };
    }

    const user = await authRepository.findUserByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const token = createSessionToken();
    const expiresAt = sessionExpiry();

    await authRepository.createSession({
      token,
      userId: user.id,
      expiresAt,
    });

    return { principal: user, token, expiresAt, kind: 'customer' as const };
  },
  async logout(sessionToken?: string) {
    if (!sessionToken) {
      return;
    }

    await authRepository.deleteSessionsByToken(sessionToken);
    await authRepository.deleteAdminSessionsByToken(sessionToken);
  },
};
