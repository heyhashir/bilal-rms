import { api } from "@/lib/api";
import type { Order } from "@/lib/account-types";

export const orderApi = {
  checkout: (payload: FormData) => api.post<{ order: Order }>("/orders/checkout", payload),
  getOrder: (orderNumber: string, token?: string) =>
    api.get<{ order: Order }>(`/orders/${orderNumber}${token ? `?token=${encodeURIComponent(token)}` : ""}`),
  track: (payload: { orderNumber: string; email: string }) => api.post<{ order: Order }>("/orders/track", payload),
};
