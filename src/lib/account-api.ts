import { api } from "@/lib/api";
import type { Address, Order, User } from "@/lib/account-types";

export const accountApi = {
  profile: () => api.get<{ user: User }>("/account/profile"),
  updateProfile: (payload: { name: string; phone?: string | null }) =>
    api.put<{ user: User }>("/account/profile", {
      name: payload.name,
      phone: payload.phone ?? "",
    }),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    api.post<{ ok: boolean }>("/account/password", payload),
  orders: () => api.get<{ orders: Order[] }>("/account/orders"),
  addresses: () => api.get<{ addresses: Address[] }>("/account/addresses"),
  createAddress: (payload: Omit<Address, "id">) =>
    api.post<{ address: Address }>("/account/addresses", {
      ...payload,
      line2: payload.line2 ?? "",
    }),
  updateAddress: (id: string, payload: Omit<Address, "id">) =>
    api.put<{ address: Address }>(`/account/addresses/${id}`, {
      ...payload,
      line2: payload.line2 ?? "",
    }),
  deleteAddress: (id: string) => api.delete<{ ok: boolean }>(`/account/addresses/${id}`),
  setDefaultAddress: (id: string) => api.post<{ ok: boolean }>(`/account/addresses/${id}/default`),
};
