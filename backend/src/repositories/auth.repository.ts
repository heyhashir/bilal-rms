import prisma from '../config/prisma';

export const authRepository = {
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
  deleteSessionsByToken(token: string) {
    return prisma.session.deleteMany({
      where: { token },
    });
  },
};
