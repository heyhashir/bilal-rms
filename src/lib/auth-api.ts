import { api } from "@/lib/api";
import type { User } from "@/lib/account-types";

export const authApi = {
  currentUser: async () => (await api.get<{ user: User | null }>("/auth/me")).user,
  register: async (payload: { email: string; name: string; password: string }) =>
    (await api.post<{ user: User }>("/auth/register", payload)).user,
  login: async (payload: { email: string; password: string }) =>
    (await api.post<{ user: User }>("/auth/login", payload)).user,
  logout: () => api.post<{ ok: boolean }>("/auth/logout"),
};
