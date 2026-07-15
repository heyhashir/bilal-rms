import bcrypt from 'bcrypt';
import { accountRepository } from '../repositories/account.repository';
import { orderRepository } from '../repositories/order.repository';

type AddressInput = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  postal: string;
  country: string;
  isDefault: boolean;
};

export const accountService = {
  getProfile(userId: string) {
    return accountRepository.findProfile(userId);
  },
  updateProfile(userId: string, input: { name: string; phone?: string }) {
    return accountRepository.updateProfile(userId, {
      name: input.name,
      phone: input.phone || null,
    });
  },
  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await accountRepository.findPasswordHash(userId);
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);

    if (!valid) {
      throw new Error('Current password is incorrect');
    }

    await accountRepository.updatePassword(userId, await bcrypt.hash(input.newPassword, 12));
  },
  listAddresses(userId: string) {
    return accountRepository.listAddresses(userId);
  },
  async createAddress(userId: string, input: AddressInput) {
    if (input.isDefault) {
      await accountRepository.clearDefaultAddresses(userId);
    }

    return accountRepository.createAddress(userId, input);
  },
  async updateAddress(userId: string, addressId: string, input: AddressInput) {
    if (input.isDefault) {
      await accountRepository.clearDefaultAddresses(userId);
    }

    return accountRepository.updateAddress(userId, addressId, input);
  },
  deleteAddress(userId: string, addressId: string) {
    return accountRepository.deleteAddress(userId, addressId);
  },
  async setDefaultAddress(userId: string, addressId: string) {
    await accountRepository.clearDefaultAddresses(userId);
    await accountRepository.setDefaultAddress(userId, addressId);
  },
  listOrders(userId: string) {
    return orderRepository.findUserOrders(userId);
  },
};
