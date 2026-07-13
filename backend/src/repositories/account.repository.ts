import prisma from '../config/prisma';

export const accountRepository = {
  findProfile(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { addresses: true },
    });
  },
  updateProfile(userId: string, data: { name: string; phone?: string | null }) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        phone: data.phone ?? null,
      },
      include: { addresses: true },
    });
  },
  findPasswordHash(userId: string) {
    return prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
  },
  updatePassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  },
  listAddresses(userId: string) {
    return prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  },
  clearDefaultAddresses(userId: string) {
    return prisma.address.updateMany({
      where: { userId },
      data: { isDefault: false },
    });
  },
  createAddress(userId: string, data: {
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    postal: string;
    country: string;
    isDefault: boolean;
  }) {
    return prisma.address.create({
      data: {
        userId,
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        postalCode: data.postal,
        country: data.country,
        isDefault: data.isDefault,
      },
    });
  },
  updateAddress(userId: string, addressId: string, data: {
    label: string;
    fullName: string;
    phone: string;
    line1: string;
    line2?: string;
    city: string;
    postal: string;
    country: string;
    isDefault: boolean;
  }) {
    return prisma.address.update({
      where: { id: addressId, userId },
      data: {
        label: data.label,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        postalCode: data.postal,
        country: data.country,
        isDefault: data.isDefault,
      },
    });
  },
  deleteAddress(userId: string, addressId: string) {
    return prisma.address.delete({
      where: { id: addressId, userId },
    });
  },
  setDefaultAddress(userId: string, addressId: string) {
    return prisma.address.update({
      where: { id: addressId, userId },
      data: { isDefault: true },
    });
  },
};
