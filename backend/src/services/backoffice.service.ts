import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { inventoryService } from './inventory.service';
import { ApiError } from '../types/ApiError';

const normalizeOptional = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const backofficeService = {
  listStaffAccounts() {
    return prisma.adminAccount.findMany({
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    });
  },
  async saveStaffAccount(input: {
    id?: string;
    email: string;
    name: string;
    phone?: string;
    role: 'admin' | 'manager' | 'staff';
    password?: string;
    isActive: boolean;
  }) {
    const existing = await prisma.adminAccount.findUnique({
      where: { email: input.email },
    });

    if (existing && existing.id !== input.id) {
      throw new ApiError(409, 'An admin account with this email already exists');
    }

    const role = input.role.toUpperCase() as 'ADMIN' | 'MANAGER' | 'STAFF';
    const data = {
      email: input.email,
      name: input.name,
      phone: normalizeOptional(input.phone),
      role,
      isActive: input.isActive,
    };

    if (!input.id) {
      if (!input.password || input.password.length < 8) {
        throw new ApiError(400, 'Password must be at least 8 characters');
      }

      return prisma.adminAccount.create({
        data: {
          ...data,
          passwordHash: await bcrypt.hash(input.password, 12),
        },
      });
    }

    return prisma.adminAccount.update({
      where: { id: input.id },
      data: {
        ...data,
        passwordHash: input.password ? await bcrypt.hash(input.password, 12) : undefined,
      },
    });
  },
  async archiveStaffAccount(id: string) {
    await prisma.adminAccount.update({
      where: { id },
      data: { isActive: false },
    });
  },
  listVendors() {
    return prisma.vendor.findMany({
      orderBy: { name: 'asc' },
    });
  },
  saveVendor(input: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    isActive: boolean;
  }) {
    if (input.id) {
      return prisma.vendor.update({
        where: { id: input.id },
        data: {
          name: input.name,
          phone: normalizeOptional(input.phone),
          email: normalizeOptional(input.email),
          address: normalizeOptional(input.address),
          notes: input.notes ?? '',
          isActive: input.isActive,
        },
      });
    }

    return prisma.vendor.create({
      data: {
        name: input.name,
        phone: normalizeOptional(input.phone),
        email: normalizeOptional(input.email),
        address: normalizeOptional(input.address),
        notes: input.notes ?? '',
        isActive: input.isActive,
      },
    });
  },
  archiveVendor(id: string) {
    return prisma.vendor.update({
      where: { id },
      data: { isActive: false },
    });
  },
  listVendorPurchases() {
    return prisma.vendorPurchase.findMany({
      include: {
        vendor: true,
        product: true,
        variant: true,
      },
      orderBy: { purchasedAt: 'desc' },
    });
  },
  async createVendorPurchase(input: {
    vendorId: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitCost: number;
    purchasedAt?: string;
    note?: string;
    adminAccountId?: string | null;
  }) {
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      include: { variants: true },
    });

    if (!product) {
      throw new ApiError(404, 'Product not found');
    }

    if (input.variantId) {
      const variant = product.variants.find((entry) => entry.id === input.variantId);
      if (!variant) {
        throw new ApiError(404, 'Variant not found');
      }
    }

    const purchasedAt = input.purchasedAt ? new Date(input.purchasedAt) : new Date();

    return prisma.$transaction(async (tx) => {
      const purchase = await tx.vendorPurchase.create({
        data: {
          vendorId: input.vendorId,
          productId: input.productId,
          variantId: input.variantId ?? null,
          quantity: input.quantity,
          unitCost: input.unitCost,
          purchasedAt,
          note: input.note ?? '',
        },
        include: {
          vendor: true,
          product: true,
          variant: true,
        },
      });

      await inventoryService.applyStockMutation(tx, {
        productId: input.productId,
        variantId: input.variantId ?? null,
        delta: input.quantity,
        reason: 'RESTOCK',
        reference: purchase.id,
        note: input.note ?? `Vendor purchase ${purchase.id}`,
      });

      await tx.inventoryMovement.updateMany({
        where: { reference: purchase.id, productId: input.productId, variantId: input.variantId ?? null },
        data: { vendorPurchaseId: purchase.id },
      });

      await tx.ledgerEntry.create({
        data: {
          type: 'PURCHASE',
          direction: 'DEBIT',
          amount: input.unitCost * input.quantity,
          reference: purchase.id,
          note: input.note ?? `Vendor purchase from ${purchase.vendor.name}`,
          vendorPurchaseId: purchase.id,
          adminAccountId: input.adminAccountId ?? null,
        },
      });

      return purchase;
    });
  },
  listLedgerEntries(params?: { from?: string; to?: string }) {
    return prisma.ledgerEntry.findMany({
      where: {
        createdAt: {
          gte: params?.from ? new Date(params.from) : undefined,
          lte: params?.to ? new Date(params.to) : undefined,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
  createLedgerEntry(input: {
    type: 'expense' | 'adjustment';
    direction: 'credit' | 'debit';
    amount: number;
    reference?: string;
    note?: string;
    adminAccountId?: string | null;
  }) {
    return prisma.ledgerEntry.create({
      data: {
        type: input.type.toUpperCase() as 'EXPENSE' | 'ADJUSTMENT',
        direction: input.direction.toUpperCase() as 'CREDIT' | 'DEBIT',
        amount: input.amount,
        reference: normalizeOptional(input.reference),
        note: input.note ?? '',
        adminAccountId: input.adminAccountId ?? null,
      },
    });
  },
};
