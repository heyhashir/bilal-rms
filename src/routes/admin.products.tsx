import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Printer, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Brand, Category, Product } from "@/lib/catalog-types";
import { ActionButton, Field, Modal, PageHeader, SelectField } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";
import { BarcodeStickerModal } from "@/components/admin/BarcodeStickerModal";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Draft = {
  id?: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  brandSlug: string;
  stockMode: "simple" | "variant";
  price: number;
  salePrice?: number;
  stock: number;
  sizeChart: "auto" | "apparel" | "bottoms" | "kids" | "none";
  sizes: string[];
  colors: { name: string; hex: string }[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  trending: boolean;
  isActive: boolean;
  images: string[];
  video: string;
  barcode: string;
  qrCode: string;
  supplierBarcode: string;
  variants: Array<{
    id?: string;
    sku: string;
    size: string;
    colorName: string;
    colorHex: string;
    stock: number;
    priceOverride?: number | null;
    costPrice?: number | null;
    isActive: boolean;
    barcode?: string;
    qrCode?: string;
    supplierBarcode?: string;
    commissionRate?: number | null;
  }>;
};

const makeDraft = (product?: Product): Draft => ({
  id: product?.id,
  slug: product?.slug ?? "",
  name: product?.name ?? "",
  description: product?.description ?? "",
  categorySlug: product?.category ?? "men",
  brandSlug: product?.brandSlug ?? "",
  stockMode: product?.stockMode ?? "simple",
  price: product?.price ?? 0,
  salePrice: product?.salePrice,
  stock: product?.stock ?? 0,
  sizeChart: (product?.sizeChart as Draft["sizeChart"]) ?? "auto",
  sizes: product?.sizes ?? [],
  colors: product?.colors ?? [],
  tags: product?.tags ?? [],
  seoTitle: product?.seoTitle ?? "",
  seoDescription: product?.seoDescription ?? "",
  featured: product?.featured ?? false,
  trending: product?.trending ?? false,
  isActive: product?.isActive ?? true,
  images: product?.images ?? [],
  video: product?.video ?? "",
  barcode: product?.barcode ?? "",
  qrCode: product?.qrCode ?? "",
  supplierBarcode: product?.supplierBarcode ?? "",
  variants: product?.variants.map((variant) => ({ ...variant })) ?? [],
});

const invalidateCatalogAfterMutation = async () => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.admin.products }),
    queryClient.invalidateQueries({ queryKey: queryKeys.catalog.bootstrap }),
    queryClient.invalidateQueries({ queryKey: queryKeys.catalog.products }),
    queryClient.invalidateQueries({ queryKey: ["catalog", "product"] }),
  ]);
};

function AdminProducts() {
  const [editing, setEditing] = useState<Draft | null>(null);
  const [printing, setPrinting] = useState<Product | null>(null);
  const { data: products = [] } = useQuery({
    queryKey: queryKeys.admin.products,
    queryFn: async () => (await adminCatalogApi.products()).products,
  });
  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.admin.categories,
    queryFn: async () => (await adminCatalogApi.categories()).categories,
  });
  const { data: brands = [] } = useQuery({
    queryKey: queryKeys.admin.brands,
    queryFn: async () => (await adminCatalogApi.brands()).brands,
  });
  const categoryOptions = useMemo(
    () => categories.flatMap((category) => [category, ...category.children]),
    [categories],
  );
  const deleteProduct = useMutation({
    mutationFn: adminCatalogApi.deleteProduct,
    onSuccess: async () => {
      await invalidateCatalogAfterMutation();
      toast.success("Product archived");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to archive product"));
    },
  });
  const restoreProduct = useMutation({
    mutationFn: adminCatalogApi.restoreProduct,
    onSuccess: async () => {
      await invalidateCatalogAfterMutation();
      toast.success("Product restored");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to restore product")),
  });
  const permanentDeleteProduct = useMutation({
    mutationFn: adminCatalogApi.permanentDeleteProduct,
    onSuccess: async () => {
      await invalidateCatalogAfterMutation();
      toast.success("Product permanently deleted");
    },
    onError: (error) => toast.error(getErrorMessage(error, "Unable to permanently delete product")),
  });

  return (
    <div>
      <PageHeader
        eyebrow="Catalog"
        title={`Products (${products.length})`}
        action={<ActionButton onClick={() => setEditing(makeDraft())}><Plus className="h-3.5 w-3.5" /> Add product</ActionButton>}
      />

      <div className="overflow-x-auto border border-border">
        <table className="min-w-[760px] w-full text-sm">
          <thead className="bg-secondary text-xs uppercase tracking-widest">
            <tr>
              <th className="p-3 text-left">Product</th>
              <th className="p-3 text-left">Category</th>
              <th className="p-3 text-left">Price</th>
              <th className="p-3 text-left">Stock</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-t border-border">
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-10 overflow-hidden bg-secondary">
                      <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{product.name}</div>
                      <div className="truncate text-xs text-muted-foreground">/{product.slug}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 capitalize">{product.category}</td>
                <td className="p-3">{product.salePrice ? <span><span className="text-muted-foreground line-through">{formatPrice(product.price)}</span> {formatPrice(product.salePrice)}</span> : formatPrice(product.price)}</td>
                <td className="p-3">{product.stock}</td>
                <td className="p-3 uppercase">{product.stockMode ?? "simple"}</td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setPrinting(product)}
                      title="Print barcode stickers"
                      className="p-2 hover:bg-secondary"
                    >
                      <Printer className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditing(makeDraft(product))} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                    {product.isActive !== false ? (
                      <button
                        onClick={() => {
                          if (confirm(`Archive "${product.name}"?`)) deleteProduct.mutate(product.id);
                        }}
                        className="p-2 hover:bg-sale hover:text-primary-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => restoreProduct.mutate(product.id)}
                        className="px-2 text-[10px] uppercase tracking-widest underline"
                      >
                        Restore
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`Permanently delete "${product.name}"? This cannot be undone.`)) {
                          permanentDeleteProduct.mutate(product.id);
                        }
                      }}
                      className="px-2 text-[10px] uppercase tracking-widest text-sale underline"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductModal
          draft={editing}
          categories={categoryOptions}
          brands={brands}
          onClose={() => setEditing(null)}
          onSave={(product) => {
            setEditing(null);
            setPrinting(product);
          }}
        />
      )}
      {printing && <BarcodeStickerModal product={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}

function ProductModal({
  draft,
  categories,
  brands,
  onClose,
  onSave,
}: {
  draft: Draft;
  categories: Category[];
  brands: Brand[];
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const [form, setForm] = useState(draft);
  // Keep generated slugs in sync with a new product name until an operator edits it.
  const [slugEdited, setSlugEdited] = useState(Boolean(draft.slug));
  const [sizeText, setSizeText] = useState(draft.sizes.join(", "));
  const [tagText, setTagText] = useState(draft.tags.join(", "));
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#111111");
  const isAccessory = form.sizeChart === "none" || inferSizeChart(form.categorySlug) === "none";
  const matrixSizes = sizeText.split(",").map((value) => value.trim()).filter(Boolean);

  const buildVariantMatrix = () => {
    const sizes = isAccessory ? ["Standard"] : matrixSizes;
    if (sizes.length === 0 || form.colors.length === 0) {
      return null;
    }

    const existingByKey = new Map(
      form.variants.map((variant) => [`${variant.size.trim().toLowerCase()}::${variant.colorName.trim().toLowerCase()}`, variant]),
    );
    const variants = sizes.flatMap((size) =>
      form.colors.map((color) => {
        const existing = existingByKey.get(`${size.toLowerCase()}::${color.name.trim().toLowerCase()}`);
        if (existing) {
          return { ...existing, size, colorName: color.name, colorHex: color.hex, isActive: true };
        }

        const sku = makeVariantSku(form.slug || form.name, color.name, size);
        return {
          sku,
          size,
          colorName: color.name,
          colorHex: color.hex,
          stock: 0,
          priceOverride: null,
          costPrice: null,
          isActive: true,
          barcode: sku,
          qrCode: `QR-${sku}`,
          supplierBarcode: "",
        };
      }),
    );
    return variants;
  };

  const generateVariantMatrix = () => {
    const variants = buildVariantMatrix();
    if (!variants) {
      toast.error("Add at least one size and one color before generating the matrix");
      return;
    }
    setForm((current) => ({ ...current, variants }));
  };

  const updateVariantStock = (size: string, color: string, stock: number) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variant.size === size && variant.colorName === color ? { ...variant, stock: Math.max(0, stock) } : variant,
      ),
    }));
  };

  const updateVariant = (
    variantId: string | undefined,
    size: string,
    colorName: string,
    changes: Partial<Draft["variants"][number]>,
  ) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        (variantId && variant.id === variantId) ||
        (!variantId && variant.size === size && variant.colorName === colorName)
          ? { ...variant, ...changes }
          : variant,
      ),
    }));
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files) return;
    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      const payload = await adminCatalogApi.uploadProductImage(file);
      uploaded.push(payload.path);
    }
    setForm((current) => ({ ...current, images: [...current.images, ...uploaded] }));
  };

  const uploadVideo = async (file: File | null) => {
    if (!file) return;
    const payload = await adminCatalogApi.uploadProductVideo(file);
    setForm((current) => ({ ...current, video: payload.path }));
  };

  const submit = async () => {
    try {
      const variants = form.stockMode === "variant" ? buildVariantMatrix() : [];
      if (form.stockMode === "variant" && !variants) {
        toast.error("Add at least one size and color before saving this variant product");
        return;
      }
      const result = await adminCatalogApi.saveProduct({
        slug: form.slug,
        name: form.name,
        description: form.description,
        categorySlug: form.categorySlug,
        brandSlug: form.brandSlug,
        stockMode: form.stockMode,
        price: form.price,
        salePrice: form.salePrice ?? null,
        stock: form.stock,
        sizeChart: form.sizeChart,
        sizes: isAccessory ? [] : sizeText.split(",").map((value) => value.trim()).filter(Boolean),
        colors: form.colors,
        tags: tagText.split(",").map((value) => value.trim()).filter(Boolean),
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        featured: form.featured,
        trending: form.trending,
        isActive: form.isActive,
        barcode: form.barcode,
        qrCode: form.qrCode,
        supplierBarcode: form.supplierBarcode,
        video: form.video,
        images: form.images,
        variants,
      }, form.id);
      toast.success(form.id ? "Product updated" : "Product created");
      await invalidateCatalogAfterMutation();
      onSave(result.product);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save product"));
    }
  };

  return (
    <Modal
      title={form.id ? "Edit product" : "New product"}
      onClose={onClose}
      wide
      footer={
        <>
          <ActionButton variant="ghost" onClick={onClose}>Cancel</ActionButton>
          <ActionButton onClick={() => void submit()}>Save</ActionButton>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            label="Name"
            value={form.name}
            autoFocus
            onChange={(v) => setForm((current) => ({ ...current, name: v, slug: slugEdited ? current.slug : slugify(v) }))}
          />
          <Field
            label="Slug"
            value={form.slug}
            onChange={(v) => {
              setSlugEdited(true);
              setForm((current) => ({ ...current, slug: slugify(v) }));
            }}
          />
        </div>
        <Field label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} textarea />
        <div className="grid gap-3 md:grid-cols-4">
          <SelectField
            label="Category"
            value={form.categorySlug}
            onChange={(v) =>
              setForm((current) => ({
                ...current,
                categorySlug: v,
                sizeChart: "auto",
              }))
            }
            options={categories.map((category) => ({ value: category.slug, label: category.name }))}
          />
          <SelectField label="Brand" value={form.brandSlug} onChange={(v) => setForm({ ...form, brandSlug: v })} options={[{ value: "", label: "No brand" }, ...brands.map((brand) => ({ value: brand.slug, label: brand.name }))]} />
          <Field label="Price" type="number" value={String(form.price)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
          <Field label="Sale price" type="number" value={String(form.salePrice ?? "")} onChange={(v) => setForm({ ...form, salePrice: v ? Number(v) : undefined })} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Barcode" value={form.barcode} onChange={(v) => setForm({ ...form, barcode: v })} />
          <Field label="QR code" value={form.qrCode} onChange={(v) => setForm({ ...form, qrCode: v })} />
          <Field label="Supplier barcode" value={form.supplierBarcode} onChange={(v) => setForm({ ...form, supplierBarcode: v })} />
        </div>
        <div className="flex gap-2">
          <ActionButton
            variant="ghost"
            onClick={async () => {
              try {
                const payload = await adminCatalogApi.generateCodes({ seed: form.slug || form.name });
                setForm((current) => ({ ...current, barcode: current.barcode || payload.barcode, qrCode: current.qrCode || payload.qrCode }));
              } catch (error) {
                toast.error(getErrorMessage(error, "Unable to generate codes"));
              }
            }}
          >
            Generate barcode + QR
          </ActionButton>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Stock mode"
            value={form.stockMode}
            onChange={(v) => setForm({ ...form, stockMode: v as Draft["stockMode"] })}
            options={[{ value: "simple", label: "Simple" }, { value: "variant", label: "Variant" }]}
          />
          {form.stockMode === "simple" ? (
            <Field label="Stock" type="number" value={String(form.stock)} onChange={(v) => setForm({ ...form, stock: Number(v) })} />
          ) : (
            <div className="border border-border bg-secondary px-3 py-2 text-sm">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Variant stock</div>
              <div className="mt-1 font-semibold">{form.variants.reduce((sum, variant) => sum + variant.stock, 0)} units</div>
            </div>
          )}
          <SelectField
            label="Size chart"
            value={form.sizeChart}
            onChange={(v) => setForm({ ...form, sizeChart: v as Draft["sizeChart"] })}
            options={[
              { value: "auto", label: "Auto by category" },
              { value: "apparel", label: "Apparel" },
              { value: "bottoms", label: "Jeans / bottoms" },
              { value: "kids", label: "Kids" },
              { value: "none", label: "No size chart" },
            ]}
          />
        </div>
        {form.stockMode === "variant" && (
          <section className="space-y-4 border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Variant configuration</div>
                <div className="mt-1 text-sm text-muted-foreground">Sizes are rows, colors are columns, and each cell is independent stock.</div>
              </div>
              <ActionButton variant="ghost" onClick={generateVariantMatrix}>Generate matrix</ActionButton>
            </div>
            {form.variants.length > 0 && (
              <div className="space-y-5">
              <div className="overflow-x-auto">
                <table className="min-w-[560px] w-full text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-widest">
                    <tr>
                      <th className="p-3 text-left">Size</th>
                      {form.colors.map((color) => <th key={color.name} className="p-3 text-left">{color.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(isAccessory ? ["Standard"] : matrixSizes).map((size) => (
                      <tr key={size} className="border-t border-border">
                        <th className="p-3 text-left font-medium">{size}</th>
                        {form.colors.map((color) => {
                          const variant = form.variants.find((entry) => entry.size === size && entry.colorName === color.name);
                          return (
                            <td key={`${size}-${color.name}`} className="p-2">
                              <input
                                type="number"
                                min={0}
                                value={variant?.stock ?? 0}
                                disabled={!variant}
                                onChange={(event) => updateVariantStock(size, color.name, Number(event.target.value) || 0)}
                                className="w-24 border border-border bg-background px-3 py-2"
                                aria-label={`${size} ${color.name} stock`}
                              />
                              {variant && <div className="mt-1 max-w-24 truncate font-mono text-[9px] text-muted-foreground">{variant.sku}</div>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <div className="mb-2 text-xs uppercase tracking-[0.25em] text-muted-foreground">Variant-specific details</div>
                <div className="overflow-x-auto border border-border">
                  <table className="min-w-[1180px] w-full text-xs">
                    <thead className="bg-secondary uppercase tracking-widest">
                      <tr>
                        <th className="p-2 text-left">Variant</th>
                        <th className="p-2 text-left">SKU</th>
                        <th className="p-2 text-left">Barcode</th>
                        <th className="p-2 text-left">Supplier code</th>
                        <th className="p-2 text-left">Sell price</th>
                        <th className="p-2 text-left">Cost</th>
                        <th className="p-2 text-left">Commission %</th>
                        <th className="p-2 text-left">Active</th>
                        <th className="p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {form.variants.map((variant) => (
                        <tr key={variant.id ?? `${variant.size}-${variant.colorName}`} className="border-t border-border">
                          <td className="p-2 font-medium">{variant.size} / {variant.colorName}</td>
                          <td className="p-2">
                            <input aria-label={`${variant.size} ${variant.colorName} SKU`} value={variant.sku} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { sku: event.target.value })} className="w-40 border border-border bg-background px-2 py-1.5 font-mono" />
                          </td>
                          <td className="p-2">
                            <input aria-label={`${variant.size} ${variant.colorName} barcode`} value={variant.barcode ?? ""} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { barcode: event.target.value })} className="w-44 border border-border bg-background px-2 py-1.5 font-mono" />
                          </td>
                          <td className="p-2">
                            <input aria-label={`${variant.size} ${variant.colorName} supplier code`} value={variant.supplierBarcode ?? ""} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { supplierBarcode: event.target.value })} className="w-36 border border-border bg-background px-2 py-1.5 font-mono" />
                          </td>
                          <td className="p-2">
                            <input aria-label={`${variant.size} ${variant.colorName} sell price`} type="number" min={0} value={variant.priceOverride ?? ""} placeholder={String(form.salePrice ?? form.price)} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { priceOverride: event.target.value === "" ? null : Number(event.target.value) })} className="w-24 border border-border bg-background px-2 py-1.5" />
                          </td>
                          <td className="p-2">
                            <input aria-label={`${variant.size} ${variant.colorName} cost`} type="number" min={0} value={variant.costPrice ?? ""} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { costPrice: event.target.value === "" ? null : Number(event.target.value) })} className="w-24 border border-border bg-background px-2 py-1.5" />
                          </td>
                          <td className="p-2">
                            <input aria-label={`${variant.size} ${variant.colorName} commission`} type="number" min={0} max={100} value={variant.commissionRate ?? ""} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { commissionRate: event.target.value === "" ? null : Number(event.target.value) })} className="w-20 border border-border bg-background px-2 py-1.5" />
                          </td>
                          <td className="p-2 text-center">
                            <input aria-label={`${variant.size} ${variant.colorName} active`} type="checkbox" checked={variant.isActive} onChange={(event) => updateVariant(variant.id, variant.size, variant.colorName, { isActive: event.target.checked })} />
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              className="underline underline-offset-2"
                              onClick={async () => {
                                try {
                                  const payload = await adminCatalogApi.generateCodes({ seed: variant.sku });
                                  updateVariant(variant.id, variant.size, variant.colorName, { barcode: payload.barcode, qrCode: payload.qrCode });
                                } catch (error) {
                                  toast.error(getErrorMessage(error, "Unable to generate variant codes"));
                                }
                              }}
                            >
                              Generate codes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>
            )}
          </section>
        )}
        {!isAccessory && <Field label="Sizes (comma separated)" value={sizeText} onChange={setSizeText} />}
        <Field label="Tags (comma separated)" value={tagText} onChange={setTagText} />
        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Colors</span>
          <div className="mb-2 flex flex-wrap gap-2">
            {form.colors.map((color, index) => (
              <span key={`${color.name}-${index}`} className="inline-flex items-center gap-2 border border-border px-2 py-1 text-xs">
                <span className="h-3 w-3 rounded-full" style={{ background: color.hex }} />
                {color.name}
                <button type="button" onClick={() => setForm({ ...form, colors: form.colors.filter((_, colorIndex) => colorIndex !== index) })}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={colorName} onChange={(e) => setColorName(e.target.value)} placeholder="Color name" className="flex-1 border border-border bg-background px-3 py-2 text-sm" />
            <input type="color" value={colorHex} onChange={(e) => setColorHex(e.target.value)} className="h-10 w-12 border border-border bg-background" />
            <button type="button" onClick={() => { if (!colorName) return; setForm({ ...form, colors: [...form.colors, { name: colorName, hex: colorHex }] }); setColorName(""); }} className="bg-secondary px-4 text-xs uppercase tracking-widest">Add</button>
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Images</span>
          <div className="mb-2 grid grid-cols-4 gap-2">
            {form.images.map((src, index) => (
              <div key={`${src}-${index}`} className="relative aspect-[4/5] overflow-hidden bg-secondary">
                <img src={src} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setForm({ ...form, images: form.images.filter((_, imageIndex) => imageIndex !== index) })} className="absolute right-1 top-1 bg-background/90 p-1"><X className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 bg-secondary px-4 py-2 text-xs uppercase tracking-widest">
              <Upload className="h-3.5 w-3.5" /> Upload
              <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => void uploadFiles(e.target.files)} />
            </label>
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">Product video</span>
          {form.video ? (
            <div className="space-y-2">
              <video src={form.video} controls className="max-h-64 w-full bg-secondary object-contain" />
              <ActionButton variant="ghost" onClick={() => setForm({ ...form, video: "" })}>
                <X className="h-3.5 w-3.5" /> Remove video
              </ActionButton>
            </div>
          ) : (
            <label className="inline-flex cursor-pointer items-center gap-2 bg-secondary px-4 py-2 text-xs uppercase tracking-widest">
              <Upload className="h-3.5 w-3.5" /> Upload video
              <input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => void uploadVideo(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>
        <Field label="SEO title" value={form.seoTitle} onChange={(v) => setForm({ ...form, seoTitle: v })} />
        <Field label="SEO description" value={form.seoDescription} onChange={(v) => setForm({ ...form, seoDescription: v })} textarea />
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
          <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured
        </label>
        <label className="flex items-center gap-2 text-xs uppercase tracking-widest">
          <input type="checkbox" checked={form.trending} onChange={(e) => setForm({ ...form, trending: e.target.checked })} /> Trending
        </label>
      </div>
    </Modal>
  );
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const makeVariantSku = (productValue: string, color: string, size: string) => {
  const base = slugify(productValue).replaceAll("-", "").toUpperCase().slice(0, 10) || "PRODUCT";
  const colorCode = color.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3) || "CLR";
  const sizeCode = size.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 5) || "STD";
  return `${base}-${colorCode}-${sizeCode}`;
};

const inferSizeChart = (categorySlug: string): "apparel" | "bottoms" | "kids" | "none" => {
  const slug = categorySlug.toLowerCase();
  if (slug === "accessories" || /accessor|watch|belt|cap|scarf|sock/.test(slug)) return "none";
  if (slug === "kids" || /kid|boy|girl|infant/.test(slug)) return "kids";
  if (/jean|bottom|trouser|pant/.test(slug)) return "bottoms";
  return "apparel";
};
