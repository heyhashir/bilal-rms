import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = {
  id: string; // composite: productId|size|color
  productId: string;
  variantId?: string | null;
  name: string;
  image: string;
  size: string;
  color: string;
  unitPrice: number;
  qty: number;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "id">) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line) => {
        const id = `${line.productId}|${line.variantId ?? ""}|${line.size}|${line.color}`;
        set((s) => {
          const existing = s.lines.find((l) => l.id === id);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.id === id ? { ...l, qty: l.qty + line.qty } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, id }] };
        });
      },
      remove: (id) => set((s) => ({ lines: s.lines.filter((l) => l.id !== id) })),
      setQty: (id, qty) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.id === id ? { ...l, qty: Math.max(1, qty) } : l,
          ),
        })),
      clear: () => set({ lines: [] }),
      count: () => get().lines.reduce((a, l) => a + l.qty, 0),
      subtotal: () => get().lines.reduce((a, l) => a + l.qty * l.unitPrice, 0),
    }),
    { name: "bg-cart-v1" },
  ),
);

type WishlistState = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((s) => ({
          ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id],
        })),
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: "bg-wishlist-v1" },
  ),
);
