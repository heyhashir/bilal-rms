import { api } from "@/lib/api";
import type { CatalogListParams } from "@/lib/catalog-filters";
import type { Brand, Category, Product, ShippingZone, StorefrontSettings } from "@/lib/catalog-types";

export type CatalogBootstrap = {
  settings: StorefrontSettings;
  categories: Category[];
  brands: Brand[];
  products: Product[];
  shippingZones: ShippingZone[];
};

export const catalogApi = {
  bootstrap: () => api.get<CatalogBootstrap>("/catalog/bootstrap"),
  products: (params?: CatalogListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.brand) searchParams.set("brand", params.brand);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.featured) searchParams.set("featured", "true");
    if (params?.trending) searchParams.set("trending", "true");
    if (params?.sort) searchParams.set("sort", params.sort);
    if (typeof params?.minPrice === "number") searchParams.set("minPrice", String(params.minPrice));
    if (typeof params?.maxPrice === "number") searchParams.set("maxPrice", String(params.maxPrice));
    if (params?.size) searchParams.set("size", params.size);
    if (params?.color) searchParams.set("color", params.color);
    if (params?.inStock) searchParams.set("inStock", "true");
    const suffix = searchParams.size ? `?${searchParams.toString()}` : "";
    return api.get<{ products: Product[]; meta: { total: number; maxEffectivePrice: number } }>(`/catalog/products${suffix}`);
  },
  saleProducts: () =>
    api.get<{ products: Product[]; meta: { total: number; maxEffectivePrice: number } }>("/catalog/products/sale"),
  product: (slug: string) => api.get<{ product: Product }>(`/catalog/products/${slug}`),
  categories: () => api.get<{ categories: Category[] }>("/categories"),
  brands: () => api.get<{ brands: Brand[] }>("/catalog/brands"),
  settings: () => api.get<{ settings: StorefrontSettings }>("/catalog/settings"),
  shippingZones: () => api.get<{ shippingZones: ShippingZone[] }>("/catalog/shipping-zones"),
};
