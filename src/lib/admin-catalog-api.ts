import { api } from "@/lib/api";
import type { Brand, Category, Product } from "@/lib/catalog-types";

export const adminCatalogApi = {
  products: () => api.get<{ products: Product[] }>("/admin/products"),
  categories: () => api.get<{ categories: Category[] }>("/admin/categories"),
  brands: () => api.get<{ brands: Brand[] }>("/admin/brands"),
  saveCategory: (payload: { name: string; slug: string; description?: string; parentId?: string | null; isActive?: boolean }) =>
    api.post<{ category: Category }>("/admin/categories", payload),
  deleteCategory: (slug: string) => api.delete<{ ok: boolean }>(`/admin/categories/${slug}`),
  saveBrand: (payload: { name: string; slug: string; country?: string; website?: string; status: "active" | "inactive" }) =>
    api.post<{ brand: Brand }>("/admin/brands", payload),
  deleteBrand: (slug: string) => api.delete<{ ok: boolean }>(`/admin/brands/${slug}`),
  saveProduct: (payload: Record<string, unknown>, productId?: string) =>
    productId
      ? api.put<{ product: Product }>(`/admin/products/${productId}`, payload)
      : api.post<{ product: Product }>("/admin/products", payload),
  deleteProduct: (id: string) => api.delete<{ ok: boolean }>(`/admin/products/${id}`),
  uploadProductImage: (file: File) => {
    const form = new FormData();
    form.set("image", file);
    return api.post<{ path: string }>("/admin/uploads/product-image", form);
  },
  uploadProductVideo: (file: File) => {
    const form = new FormData();
    form.set("video", file);
    return api.post<{ path: string }>("/admin/uploads/product-video", form);
  },
  importCatalog: (file: File) => {
    const form = new FormData();
    form.set("file", file);
    return api.post<{
      count: number;
      successCount: number;
      failureCount: number;
      failures: Array<{ row: number; slug: string; message: string }>;
    }>("/admin/products/import", form);
  },
  uploadDiagnostics: () =>
    api.get<{
      totals: { productImages: number; paymentProofs: number };
      missingProductImages: string[];
      missingPaymentProofs: string[];
    }>("/admin/uploads/diagnostics"),
  generateCodes: (payload?: { prefix?: string; qrPrefix?: string; seed?: string }) =>
    api.post<{ barcode: string; qrCode: string }>("/admin/barcodes/generate", payload ?? {}),
};
