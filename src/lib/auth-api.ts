import { api } from "@/lib/api";
import type { User } from "@/lib/account-types";
import { getDesktopBridge } from "@/lib/desktop-bridge";

export const authApi = {
  currentUser: async () => {
    try {
      const user = (await api.get<{ user: User | null }>("/auth/me")).user;
      getDesktopBridge()?.cacheCurrentUser(user);
      return user;
    } catch (error) {
      const cached = getDesktopBridge()?.getCachedCurrentUser();
      if (cached) {
        return cached;
      }

      throw error;
    }
  },
  register: async (payload: { email: string; name: string; password: string }) =>
    (await api.post<{ user: User }>("/auth/register", payload)).user,
  login: async (payload: { email: string; password: string }) =>
    {
      const user = (await api.post<{ user: User }>("/auth/login", payload)).user;
      getDesktopBridge()?.cacheCurrentUser(user);
      return user;
    },
  logout: async () => {
    try {
      return await api.post<{ ok: boolean }>("/auth/logout");
    } finally {
      getDesktopBridge()?.cacheCurrentUser(null);
    }
  },
};
