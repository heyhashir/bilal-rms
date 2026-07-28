import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import {
  serializeAdminAccountSummary,
  serializeLedgerEntry,
  serializeVendor,
  serializeVendorPurchase,
} from '../../utils/serializers';
import { backofficeService } from '../../services/backoffice.service';
import { logAdminAudit } from '../../utils/adminAudit';

export const listStaffAccounts = async (_req: Request, res: Response) => {
  const accounts = await backofficeService.listStaffAccounts();
  res.status(200).json(ApiResponse.success('Staff accounts loaded', { accounts: accounts.map(serializeAdminAccountSummary) }));
};

export const saveStaffAccount = async (req: Request, res: Response) => {
  const account = await backofficeService.saveStaffAccount(req.body);
  logAdminAudit(req, {
    action: req.body.id ? 'staff-account.updated' : 'staff-account.created',
    targetType: 'staff-account',
    targetId: account.id,
    details: { email: account.email, role: account.role, isActive: account.isActive },
  });
  res.status(req.body.id ? 200 : 201).json(ApiResponse.success('Staff account saved', { account: serializeAdminAccountSummary(account) }));
};

export const archiveStaffAccount = async (req: Request, res: Response) => {
  await backofficeService.archiveStaffAccount(req.params.id);
  logAdminAudit(req, {
    action: 'staff-account.archived',
    targetType: 'staff-account',
    targetId: req.params.id,
  });
  res.status(200).json(ApiResponse.success('Staff account archived', { ok: true }));
};

export const listVendors = async (_req: Request, res: Response) => {
  const vendors = await backofficeService.listVendors();
  res.status(200).json(ApiResponse.success('Vendors loaded', { vendors: vendors.map(serializeVendor) }));
};

export const saveVendor = async (req: Request, res: Response) => {
  const vendor = await backofficeService.saveVendor(req.body);
  logAdminAudit(req, {
    action: req.body.id ? 'vendor.updated' : 'vendor.created',
    targetType: 'vendor',
    targetId: vendor.id,
    details: { name: vendor.name, isActive: vendor.isActive },
  });
  res.status(req.body.id ? 200 : 201).json(ApiResponse.success('Vendor saved', { vendor: serializeVendor(vendor) }));
};

export const archiveVendor = async (req: Request, res: Response) => {
  await backofficeService.archiveVendor(req.params.id);
  logAdminAudit(req, {
    action: 'vendor.archived',
    targetType: 'vendor',
    targetId: req.params.id,
  });
  res.status(200).json(ApiResponse.success('Vendor archived', { ok: true }));
};

export const listVendorPurchases = async (_req: Request, res: Response) => {
  const purchases = await backofficeService.listVendorPurchases();
  res.status(200).json(ApiResponse.success('Vendor purchases loaded', { purchases: purchases.map(serializeVendorPurchase) }));
};

export const createVendorPurchase = async (req: Request, res: Response) => {
  const purchase = await backofficeService.createVendorPurchase({
    ...req.body,
    adminAccountId: req.currentUser?.kind === 'admin' ? req.currentUser.id : null,
  });
  logAdminAudit(req, {
    action: 'vendor-purchase.created',
    targetType: 'vendor-purchase',
    targetId: purchase.id,
    details: { vendorId: purchase.vendorId, productId: purchase.productId, quantity: purchase.quantity },
  });
  res.status(201).json(ApiResponse.success('Vendor purchase saved', { purchase: serializeVendorPurchase(purchase) }));
};

export const reverseVendorPurchase = async (req: Request, res: Response) => {
  const purchase = await backofficeService.reverseVendorPurchase({
    purchaseId: req.params.id,
    reason: req.body.reason,
    adminAccountId: req.currentUser!.id,
  });
  logAdminAudit(req, {
    action: 'vendor-purchase.reversed',
    targetType: 'vendor-purchase',
    targetId: purchase.id,
    details: { reason: req.body.reason, quantity: purchase.quantity, productId: purchase.productId },
  });
  res.status(200).json(ApiResponse.success('Purchase reversed and stock corrected', { purchase: serializeVendorPurchase(purchase) }));
};

export const listLedgerEntries = async (req: Request, res: Response) => {
  const from = typeof req.query.from === 'string' ? req.query.from : undefined;
  const to = typeof req.query.to === 'string' ? req.query.to : undefined;
  const entries = await backofficeService.listLedgerEntries({ from, to });
  res.status(200).json(ApiResponse.success('Ledger entries loaded', { entries: entries.map(serializeLedgerEntry) }));
};

export const createLedgerEntry = async (req: Request, res: Response) => {
  const entry = await backofficeService.createLedgerEntry({
    ...req.body,
    adminAccountId: req.currentUser?.kind === 'admin' ? req.currentUser.id : null,
  });
  logAdminAudit(req, {
    action: 'ledger-entry.created',
    targetType: 'ledger-entry',
    targetId: entry.id,
    details: { type: entry.type, direction: entry.direction, amount: Number(entry.amount) },
  });
  res.status(201).json(ApiResponse.success('Ledger entry saved', { entry: serializeLedgerEntry(entry) }));
};

export const updateLedgerEntry = async (req: Request, res: Response) => {
  const entry = await backofficeService.updateManualLedgerEntry({ id: req.params.id, ...req.body });
  logAdminAudit(req, {
    action: 'ledger-entry.updated',
    targetType: 'ledger-entry',
    targetId: entry.id,
    details: { type: entry.type, direction: entry.direction, amount: Number(entry.amount) },
  });
  res.status(200).json(ApiResponse.success('Ledger entry updated', { entry: serializeLedgerEntry(entry) }));
};

export const deleteLedgerEntry = async (req: Request, res: Response) => {
  const entry = await backofficeService.deleteManualLedgerEntry(req.params.id);
  logAdminAudit(req, {
    action: 'ledger-entry.deleted',
    targetType: 'ledger-entry',
    targetId: entry.id,
    details: { type: entry.type, direction: entry.direction, amount: Number(entry.amount) },
  });
  res.status(200).json(ApiResponse.success('Manual ledger entry deleted', { ok: true }));
};
