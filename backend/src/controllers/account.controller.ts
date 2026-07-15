import { Request, Response } from 'express';
import { ApiResponse } from '../utils/ApiResponse';
import { serializeOrder, serializeUser } from '../utils/serializers';
import { accountService } from '../services/account.service';

const serializeAddress = (address: {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}) => ({
  id: address.id,
  label: address.label,
  fullName: address.fullName,
  phone: address.phone,
  line1: address.line1,
  line2: address.line2 ?? '',
  city: address.city,
  postal: address.postalCode,
  country: address.country,
  isDefault: address.isDefault,
});

export const getProfile = async (req: Request, res: Response) => {
  const user = await accountService.getProfile(req.currentUser!.id);
  res.status(200).json(ApiResponse.success('Profile loaded', { user: serializeUser(user) }));
};

export const updateProfile = async (req: Request, res: Response) => {
  const input = req.body as { name: string; phone?: string };
  const user = await accountService.updateProfile(req.currentUser!.id, input);
  res.status(200).json(ApiResponse.success('Profile updated', { user: serializeUser(user) }));
};

export const updatePassword = async (req: Request, res: Response) => {
  const input = req.body as { currentPassword: string; newPassword: string };
  await accountService.changePassword(req.currentUser!.id, input);
  res.status(200).json(ApiResponse.success('Password updated', { ok: true }));
};

export const listAddresses = async (req: Request, res: Response) => {
  const addresses = await accountService.listAddresses(req.currentUser!.id);
  res.status(200).json(
    ApiResponse.success('Addresses loaded', {
      addresses: addresses.map(serializeAddress),
    }),
  );
};

export const createAddress = async (req: Request, res: Response) => {
  const address = await accountService.createAddress(req.currentUser!.id, req.body as never);
  res.status(201).json(ApiResponse.success('Address created', { address: serializeAddress(address) }));
};

export const saveAddress = async (req: Request, res: Response) => {
  const address = await accountService.updateAddress(req.currentUser!.id, req.params.id, req.body as never);
  res.status(200).json(ApiResponse.success('Address updated', { address: serializeAddress(address) }));
};

export const deleteAddress = async (req: Request, res: Response) => {
  await accountService.deleteAddress(req.currentUser!.id, req.params.id);
  res.status(200).json(ApiResponse.success('Address deleted', { ok: true }));
};

export const markDefaultAddress = async (req: Request, res: Response) => {
  await accountService.setDefaultAddress(req.currentUser!.id, req.params.id);
  res.status(200).json(ApiResponse.success('Default address updated', { ok: true }));
};

export const listAccountOrders = async (req: Request, res: Response) => {
  const orders = await accountService.listOrders(req.currentUser!.id);
  res.status(200).json(ApiResponse.success('Orders loaded', { orders: orders.map(serializeOrder) }));
};
