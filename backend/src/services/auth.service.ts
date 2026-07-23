import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { authRepository } from '../repositories/auth.repository';
import { ApiError } from '../types/ApiError';
import { createSessionToken } from '../utils/cookies';

const sessionExpiry = () => new Date(Date.now() + env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

export const authService = {
  getCurrentUser(userId: string) {
    return authRepository.findUserProfile(userId);
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
    const user = await authRepository.findUserByEmail(input.email.toLowerCase());

    if (!user || !user.isActive) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    if (input.currentSessionToken) {
      await authRepository.deleteSessionsByToken(input.currentSessionToken);
    }

    const token = createSessionToken();
    const expiresAt = sessionExpiry();

    await authRepository.createSession({
      token,
      userId: user.id,
      expiresAt,
    });

    return { user, token, expiresAt };
  },
  async logout(sessionToken?: string) {
    if (!sessionToken) {
      return;
    }

    await authRepository.deleteSessionsByToken(sessionToken);
  },
};
