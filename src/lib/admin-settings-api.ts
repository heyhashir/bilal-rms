import { api } from "@/lib/api";
import type { ShippingZone, StorefrontSettings } from "@/lib/catalog-types";

export const adminSettingsApi = {
  settings: () => api.get<{ settings: StorefrontSettings; shippingZones: ShippingZone[] }>("/admin/settings"),
  updateSettings: (payload: Record<string, unknown>) => api.put<{ settings: StorefrontSettings }>("/admin/settings", payload),
  saveShippingZone: (payload: Record<string, unknown>) => api.post<{ zone: ShippingZone }>("/admin/shipping-zones", payload),
  deleteShippingZone: (id: string) => api.delete<{ ok: boolean }>(`/admin/shipping-zones/${id}`),
};
