import { api } from "@/lib/api";
import type { LedgerEntry, StaffAccount, Vendor, VendorPurchase } from "@/lib/admin-types";

export const adminBackofficeApi = {
  staffAccounts: () => api.get<{ accounts: StaffAccount[] }>("/admin/staff-accounts"),
  saveStaffAccount: (payload: {
    id?: string;
    email: string;
    name: string;
    phone?: string;
    role: "admin" | "manager" | "staff";
    password?: string;
    isActive: boolean;
  }) => api.post<{ account: StaffAccount }>("/admin/staff-accounts", payload),
  deleteStaffAccount: (id: string) => api.delete<{ ok: boolean }>(`/admin/staff-accounts/${id}`),
  vendors: () => api.get<{ vendors: Vendor[] }>("/admin/vendors"),
  saveVendor: (payload: {
    id?: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    isActive: boolean;
  }) => api.post<{ vendor: Vendor }>("/admin/vendors", payload),
  deleteVendor: (id: string) => api.delete<{ ok: boolean }>(`/admin/vendors/${id}`),
  vendorPurchases: () => api.get<{ purchases: VendorPurchase[] }>("/admin/vendor-purchases"),
  createVendorPurchase: (payload: {
    vendorId: string;
    productId: string;
    variantId?: string | null;
    quantity: number;
    unitCost: number;
    purchasedAt?: string;
    note?: string;
  }) => api.post<{ purchase: VendorPurchase }>("/admin/vendor-purchases", payload),
  ledgerEntries: (params?: { from?: string; to?: string }) => {
    const query = new URLSearchParams();
    if (params?.from) query.set("from", params.from);
    if (params?.to) query.set("to", params.to);
    const suffix = query.size ? `?${query.toString()}` : "";
    return api.get<{ entries: LedgerEntry[] }>(`/admin/ledger${suffix}`);
  },
  createLedgerEntry: (payload: {
    type: "expense" | "adjustment";
    direction: "credit" | "debit";
    amount: number;
    reference?: string;
    note?: string;
  }) => api.post<{ entry: LedgerEntry }>("/admin/ledger", payload),
};
