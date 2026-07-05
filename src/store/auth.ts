import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine } from "./cart";

export type Address = {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  postal: string;
  country: string;
  isDefault: boolean;
};

export type User = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "admin";
  password: string; // demo only
  addresses: Address[];
};

type AuthState = {
  users: User[];
  currentId: string | null;
  register: (data: { email: string; name: string; password: string }) => string | null;
  login: (email: string, password: string) => string | null;
  logout: () => void;
  current: () => User | null;
  updateCurrent: (patch: Partial<User>) => void;
  resetPassword: (email: string, newPassword: string) => string | null;
  addAddress: (a: Omit<Address, "id">) => void;
  updateAddress: (id: string, patch: Partial<Address>) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
};

const adminSeed: User = {
  id: "u-admin",
  email: "admin@bilalgarments.pk",
  name: "Bilal (Admin)",
  role: "admin",
  password: "admin123",
  addresses: [],
};

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2));

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      users: [adminSeed],
      currentId: null,
      register: ({ email, name, password }) => {
        const exists = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (exists) return "Email already registered";
        const u: User = { id: uid(), email, name, password, role: "customer", addresses: [] };
        set((s) => ({ users: [...s.users, u], currentId: u.id }));
        return null;
      },
      login: (email, password) => {
        const u = get().users.find(
          (x) => x.email.toLowerCase() === email.toLowerCase() && x.password === password,
        );
        if (!u) return "Invalid credentials";
        set({ currentId: u.id });
        return null;
      },
      logout: () => set({ currentId: null }),
      current: () => get().users.find((u) => u.id === get().currentId) ?? null,
      updateCurrent: (patch) => set((s) => ({
        users: s.users.map((u) => (u.id === s.currentId ? { ...u, ...patch } : u)),
      })),
      resetPassword: (email, newPassword) => {
        const exists = get().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!exists) return "No account with this email";
        set((s) => ({ users: s.users.map((u) => u.email.toLowerCase() === email.toLowerCase() ? { ...u, password: newPassword } : u) }));
        return null;
      },
      addAddress: (a) => set((s) => ({
        users: s.users.map((u) => {
          if (u.id !== s.currentId) return u;
          const addr: Address = { ...a, id: uid() };
          const list = a.isDefault ? [addr, ...u.addresses.map((x) => ({ ...x, isDefault: false }))] : [...u.addresses, addr];
          return { ...u, addresses: list };
        }),
      })),
      updateAddress: (id, patch) => set((s) => ({
        users: s.users.map((u) => u.id !== s.currentId ? u : { ...u, addresses: u.addresses.map((a) => a.id === id ? { ...a, ...patch } : a) }),
      })),
      removeAddress: (id) => set((s) => ({
        users: s.users.map((u) => u.id !== s.currentId ? u : { ...u, addresses: u.addresses.filter((a) => a.id !== id) }),
      })),
      setDefaultAddress: (id) => set((s) => ({
        users: s.users.map((u) => u.id !== s.currentId ? u : { ...u, addresses: u.addresses.map((a) => ({ ...a, isDefault: a.id === id })) }),
      })),
    }),
    {
      name: "bg-auth-v1",
      // migrate legacy users missing addresses
      migrate: (persisted) => {
        const p = persisted as { users?: User[] } | undefined;
        if (p?.users) p.users = p.users.map((u) => ({ ...u, addresses: u.addresses ?? [] }));
        return persisted as AuthState;
      },
      version: 2,
    },
  ),
);

export type Order = {
  id: string;
  userId: string | null;
  email: string;
  customerName: string;
  lines: CartLine[];
  shipping: {
    address: string;
    city: string;
    postal: string;
    phone: string;
  };
  payment: "cod" | "jazzcash" | "easypaisa" | "card";
  subtotal: number;
  shippingFee: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: number;
};

type OrderState = {
  orders: Order[];
  add: (o: Omit<Order, "id" | "createdAt" | "status">) => Order;
  updateStatus: (id: string, status: Order["status"]) => void;
};

export const useOrders = create<OrderState>()(
  persist(
    (set) => ({
      orders: [],
      add: (o) => {
        const order: Order = {
          ...o,
          id: `BG-${Date.now().toString(36).toUpperCase()}`,
          status: "pending",
          createdAt: Date.now(),
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return order;
      },
      updateStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
        })),
    }),
    { name: "bg-orders-v1" },
  ),
);
