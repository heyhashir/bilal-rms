import prisma from '../config/prisma';

export const authRepository = {
  findAdminAccountById(accountId: string) {
    return prisma.adminAccount.findUniqueOrThrow({
      where: { id: accountId },
    });
  },
  findAdminAccountByEmail(email: string) {
    return prisma.adminAccount.findUnique({
      where: { email },
    });
  },
  listAdminAccounts() {
    return prisma.adminAccount.findMany({
      orderBy: { createdAt: 'desc' },
    });
  },
  createAdminAccount(data: {
    email: string;
    name: string;
    phone?: string | null;
    passwordHash: string;
    role: 'ADMIN' | 'MANAGER' | 'STAFF';
  }) {
    return prisma.adminAccount.create({
      data,
    });
  },
  updateAdminAccount(
    id: string,
    data: {
      email?: string;
      name?: string;
      phone?: string | null;
      role?: 'ADMIN' | 'MANAGER' | 'STAFF';
      isActive?: boolean;
      passwordHash?: string;
      lastLoginAt?: Date | null;
    },
  ) {
    return prisma.adminAccount.update({
      where: { id },
      data,
    });
  },
  findUserProfile(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { addresses: true },
    });
  },
  findUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      include: { addresses: true },
    });
  },
  createUser(data: { email: string; name: string; passwordHash: string }) {
    return prisma.user.create({
      data,
      include: { addresses: true },
    });
  },
  createSession(data: { token: string; userId: string; expiresAt: Date }) {
    return prisma.session.create({
      data,
    });
  },
  findCustomerSessionByToken(token: string) {
    return prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
  },
  createAdminSession(data: { token: string; accountId: string; expiresAt: Date }) {
    return prisma.adminSession.create({
      data,
    });
  },
  findAdminSessionByToken(token: string) {
    return prisma.adminSession.findUnique({
      where: { token },
      include: { account: true },
    });
  },
  deleteSessionsByToken(token: string) {
    return prisma.session.deleteMany({
      where: { token },
    });
  },
  deleteAdminSessionsByToken(token: string) {
    return prisma.adminSession.deleteMany({
      where: { token },
    });
  },
};
