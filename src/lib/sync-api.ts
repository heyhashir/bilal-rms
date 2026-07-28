import { api } from "@/lib/api";
import type { Employee, SyncDiagnostics } from "@/lib/admin-types";
import type { Product, StorefrontSettings } from "@/lib/catalog-types";

export const syncApi = {
  syncBootstrap: (deviceKey: string, cursor?: string) =>
    api.get<{
      settings: StorefrontSettings;
      products: Product[];
      employees: Employee[];
      cursor: string;
      requestedCursor: string | null;
      changed: boolean;
    }>(`/sync/bootstrap?deviceKey=${encodeURIComponent(deviceKey)}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  registerDevice: (payload: { deviceKey: string; name: string; notes?: string }) =>
    api.post<{
      device: {
        id: string;
        name: string;
        deviceKey: string;
        syncStatus: string;
        lastSeenAt: number | null;
        lastSyncAt: number | null;
        lastBootstrapAt: number | null;
        lastCursor: string | null;
        lastSyncError: string;
      };
    }>("/sync/register", payload),
  pushSyncJobs: (payload: {
    deviceKey: string;
    cursor?: string;
    jobs: Array<{
      jobKey: string;
      direction?: "push" | "pull";
      entityType: string;
      entityId?: string;
      payload: unknown;
      status?: "pending" | "synced" | "failed";
      error?: string;
    }>;
  }) => api.post<{ count: number }>("/sync/push", payload),
  pushSyncEvents: (payload: {
    deviceKey: string;
    cursor?: string;
    jobs: Array<{
      jobKey: string;
      direction?: "push" | "pull";
      entityType: string;
      entityId?: string;
      payload: unknown;
      status?: "pending" | "synced" | "failed";
      error?: string;
    }>;
  }) => api.post<{ count: number }>("/sync/jobs", payload),
  updateManifest: (deviceKey: string, currentVersion?: string) =>
    api.get<{
      manifest: {
        deviceKey: string;
        currentVersion: string | null;
        latestVersion: string;
        available: boolean;
        mandatory: boolean;
        notes: string;
        publishedAt: number;
        windows: {
          installerUrl: string;
          manifestUrl: string;
          sha256: string | null;
          size: number | null;
        } | null;
      };
    }>(`/sync/updates/${encodeURIComponent(deviceKey)}${currentVersion ? `?currentVersion=${encodeURIComponent(currentVersion)}` : ""}`),
  syncDiagnostics: () => api.get<SyncDiagnostics>("/admin/sync-diagnostics"),
  retryJob: (id: string) => api.post<{ job: { id: string; status: string; attempts: number; lastError: string } }>(`/admin/sync-jobs/${id}/retry`),
  resolveJob: (id: string) => api.post<{ job: { id: string; status: string; attempts: number; lastError: string } }>(`/admin/sync-jobs/${id}/resolve`),
};
