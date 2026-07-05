import { create } from "zustand";
import { persist } from "zustand/middleware";
import { seedProducts, type Product } from "@/data/seed";
import { categories as defaultCats, type CategorySlug } from "@/config/site";

type Category = { slug: string; name: string };

type CatalogState = {
  products: Product[];
  categories: Category[];
  addProduct: (p: Omit<Product, "id" | "createdAt">) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  decrementStock: (id: string, qty: number) => void;
  upsertCategory: (c: Category) => void;
  deleteCategory: (slug: string) => void;
};

export const useCatalog = create<CatalogState>()(
  persist(
    (set) => ({
      products: seedProducts,
      categories: [...defaultCats],
      addProduct: (p) =>
        set((s) => ({
          products: [
            { ...p, id: crypto.randomUUID(), createdAt: Date.now() },
            ...s.products,
          ],
        })),
      updateProduct: (id, patch) =>
        set((s) => ({
          products: s.products.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
      decrementStock: (id, qty) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, stock: Math.max(0, p.stock - qty) } : p,
          ),
        })),
      upsertCategory: (c) =>
        set((s) => ({
          categories: s.categories.find((x) => x.slug === c.slug)
            ? s.categories.map((x) => (x.slug === c.slug ? c : x))
            : [...s.categories, c],
        })),
      deleteCategory: (slug) =>
        set((s) => ({ categories: s.categories.filter((c) => c.slug !== slug) })),
    }),
    { name: "bg-catalog-v1" },
  ),
);

export type { Product, CategorySlug };
