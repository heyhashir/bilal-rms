import { create } from "zustand";
import { accountApi } from "@/lib/account-api";
import { getErrorMessage } from "@/lib/api";
import { authApi } from "@/lib/auth-api";
import type { Address, Order, User } from "@/lib/account-types";
import { APP_QUERY_STALE_MS, queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
export type { Address, Order, User } from "@/lib/account-types";

type AuthState = {
  user: User | null;
  loading: boolean;
  hydrated: boolean;
  authRequestId: number;
  hydrate: () => Promise<void>;
  expireSession: () => void;
  register: (data: { email: string; name: string; password: string }) => Promise<string | null>;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  updateCurrent: (patch: Partial<Pick<User, "name" | "phone">>) => Promise<string | null>;
  addAddress: (address: Omit<Address, "id">) => Promise<string | null>;
  updateAddress: (id: string, address: Partial<Address>) => Promise<string | null>;
  removeAddress: (id: string) => Promise<string | null>;
  setDefaultAddress: (id: string) => Promise<string | null>;
};

const setUserState = (set: (partial: Partial<AuthState>) => void, user: User | null) => {
  set({
    user,
  });
};

const currentUserQuery = {
  queryKey: queryKeys.auth.currentUser,
  queryFn: authApi.currentUser,
  staleTime: APP_QUERY_STALE_MS,
} as const;

const clearProtectedQueries = () => {
  queryClient.removeQueries({ queryKey: queryKeys.account.profile });
  queryClient.removeQueries({ queryKey: queryKeys.account.orders });
  queryClient.removeQueries({ queryKey: queryKeys.account.addresses });
  queryClient.removeQueries({ queryKey: queryKeys.admin.dashboard });
  queryClient.removeQueries({ queryKey: queryKeys.admin.products });
  queryClient.removeQueries({ queryKey: queryKeys.admin.inventorySnapshot });
  queryClient.removeQueries({ queryKey: queryKeys.admin.inventoryLedger });
  queryClient.removeQueries({ queryKey: queryKeys.admin.categories });
  queryClient.removeQueries({ queryKey: queryKeys.admin.brands });
  queryClient.removeQueries({ queryKey: queryKeys.admin.orders });
  queryClient.removeQueries({ queryKey: queryKeys.admin.customers });
  queryClient.removeQueries({ queryKey: queryKeys.admin.employees });
  queryClient.removeQueries({ queryKey: queryKeys.admin.returns });
  queryClient.removeQueries({ queryKey: queryKeys.admin.settings });
  queryClient.removeQueries({ queryKey: queryKeys.admin.commissions });
  queryClient.removeQueries({ queryKey: queryKeys.admin.posSales });
  queryClient.removeQueries({ queryKey: queryKeys.admin.syncDiagnostics });
  queryClient.removeQueries({ queryKey: queryKeys.pos.products });
  queryClient.removeQueries({ queryKey: queryKeys.pos.employees });
  queryClient.removeQueries({ queryKey: queryKeys.pos.settings });
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  hydrated: false,
  authRequestId: 0,
  hydrate: async () => {
    if (get().loading || get().hydrated) {
      return;
    }

    const requestId = get().authRequestId + 1;
    set({ loading: true, authRequestId: requestId });
    try {
      const user = await queryClient.fetchQuery(currentUserQuery);
      if (get().authRequestId !== requestId) {
        return;
      }
      setUserState(set, user);
      set({ hydrated: true, loading: false });
    } catch (error) {
      console.error(error);
      if (get().authRequestId !== requestId) {
        return;
      }
      set({ loading: false, hydrated: true });
    }
  },
  expireSession: () => {
    const requestId = get().authRequestId + 1;
    setUserState(set, null);
    set({ loading: false, hydrated: true, authRequestId: requestId });
    queryClient.setQueryData(queryKeys.auth.currentUser, null);
    clearProtectedQueries();
  },
  register: async (data) => {
    try {
      const requestId = get().authRequestId + 1;
      set({ loading: true, authRequestId: requestId });
      const user = await authApi.register(data);
      if (get().authRequestId !== requestId) {
        return "Authentication state changed while registering";
      }
      queryClient.setQueryData(queryKeys.auth.currentUser, user);
      setUserState(set, user);
      set({ loading: false, hydrated: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser });
      return null;
    } catch (error) {
      set({ loading: false, hydrated: true });
      return getErrorMessage(error, "Unable to create account");
    }
  },
  login: async (email, password) => {
    try {
      const requestId = get().authRequestId + 1;
      set({ loading: true, authRequestId: requestId });
      const user = await authApi.login({ email, password });
      if (get().authRequestId !== requestId) {
        return "Authentication state changed while signing in";
      }
      queryClient.setQueryData(queryKeys.auth.currentUser, user);
      setUserState(set, user);
      set({ loading: false, hydrated: true });
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser });
      return null;
    } catch (error) {
      set({ loading: false, hydrated: true });
      return getErrorMessage(error, "Unable to sign in");
    }
  },
  logout: async () => {
    try {
      const requestId = get().authRequestId + 1;
      set({ loading: true, authRequestId: requestId });
      await authApi.logout();
    } finally {
      setUserState(set, null);
      set({ loading: false, hydrated: true });
      queryClient.setQueryData(queryKeys.auth.currentUser, null);
      clearProtectedQueries();
    }
  },
  updateCurrent: async (patch) => {
    try {
      const payload = await accountApi.updateProfile(patch);
      queryClient.setQueryData(queryKeys.auth.currentUser, payload.user);
      queryClient.setQueryData(queryKeys.account.profile, payload.user);
      setUserState(set, payload.user);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser });
      return null;
    } catch (error) {
      return getErrorMessage(error, "Unable to update profile");
    }
  },
  addAddress: async (address) => {
    try {
      await accountApi.createAddress(address);
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.addresses });
      const profile = await accountApi.profile();
      queryClient.setQueryData(queryKeys.account.profile, profile.user);
      queryClient.setQueryData(queryKeys.auth.currentUser, profile.user);
      setUserState(set, profile.user);
      return null;
    } catch (error) {
      return getErrorMessage(error, "Unable to save address");
    }
  },
  updateAddress: async (id, address) => {
    const existing = get().user?.addresses.find((entry) => entry.id === id);
    if (!existing) {
      return "Address not found";
    }

    try {
      await accountApi.updateAddress(id, {
        ...existing,
        ...address,
        line2: address.line2 ?? existing.line2 ?? "",
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.addresses });
      const profile = await accountApi.profile();
      queryClient.setQueryData(queryKeys.account.profile, profile.user);
      queryClient.setQueryData(queryKeys.auth.currentUser, profile.user);
      setUserState(set, profile.user);
      return null;
    } catch (error) {
      return getErrorMessage(error, "Unable to update address");
    }
  },
  removeAddress: async (id) => {
    try {
      await accountApi.deleteAddress(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.addresses });
      const profile = await accountApi.profile();
      queryClient.setQueryData(queryKeys.account.profile, profile.user);
      queryClient.setQueryData(queryKeys.auth.currentUser, profile.user);
      setUserState(set, profile.user);
      return null;
    } catch (error) {
      return getErrorMessage(error, "Unable to remove address");
    }
  },
  setDefaultAddress: async (id) => {
    try {
      await accountApi.setDefaultAddress(id);
      await queryClient.invalidateQueries({ queryKey: queryKeys.account.addresses });
      const profile = await accountApi.profile();
      queryClient.setQueryData(queryKeys.account.profile, profile.user);
      queryClient.setQueryData(queryKeys.auth.currentUser, profile.user);
      setUserState(set, profile.user);
      return null;
    } catch (error) {
      return getErrorMessage(error, "Unable to update default address");
    }
  },
}));
