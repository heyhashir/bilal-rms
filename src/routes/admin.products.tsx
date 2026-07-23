import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Brand, Category, Product } from "@/lib/catalog-types";
import { ActionButton, Field, Modal, PageHeader, SelectField } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";

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
  sizeChart: "apparel" | "kids" | "none";
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
  variantsJson: string;
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
  sizeChart: (product?.sizeChart as Draft["sizeChart"]) ?? "apparel",
  sizes: product?.sizes ?? [],
  colors: product?.colors ?? [],
  tags: product?.tags ?? [],
  seoTitle: product?.seoTitle ?? "",
  seoDescription: product?.seoDescription ?? "",
  featured: product?.featured ?? false,
  trending: product?.trending ?? false,
  isActive: true,
  images: product?.images ?? [],
  video: product?.video ?? "",
  barcode: product?.barcode ?? "",
  qrCode: product?.qrCode ?? "",
  supplierBarcode: product?.supplierBarcode ?? "",
  variantsJson: product ? JSON.stringify(product.variants, null, 2) : "[]",
});

function AdminProducts() {
  const [editing, setEditing] = useState<Draft | null>(null);
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
  const deleteProduct = useMutation({
    mutationFn: adminCatalogApi.deleteProduct,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
      toast.success("Product archived");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Unable to archive product"));
    },
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
                    <button onClick={() => setEditing(makeDraft(product))} className="p-2 hover:bg-secondary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button
                      onClick={async () => {
                        if (confirm(`Archive "${product.name}"?`)) {
                          deleteProduct.mutate(product.id);
                        }
                      }}
                      className="p-2 hover:bg-sale hover:text-primary-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
          categories={categories}
          brands={brands}
          onClose={() => setEditing(null)}
          onSave={() => setEditing(null)}
        />
      )}
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
  onSave: () => void;
}) {
  const [form, setForm] = useState(draft);
  const [sizeText, setSizeText] = useState(draft.sizes.join(", "));
  const [tagText, setTagText] = useState(draft.tags.join(", "));
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#111111");
  const isAccessory = form.categorySlug === "accessories";

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
      await adminCatalogApi.saveProduct({
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
        variants: JSON.parse(form.variantsJson || "[]"),
      }, form.id);
      toast.success(form.id ? "Product updated" : "Product created");
      await queryClient.invalidateQueries({ queryKey: queryKeys.admin.products });
      onSave();
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
          <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v, slug: form.slug || slugify(v) })} />
          <Field label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: slugify(v) })} />
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
                sizeChart: v === "accessories" ? "none" : current.sizeChart === "none" ? "apparel" : current.sizeChart,
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
          <SelectField label="Stock mode" value={form.stockMode} onChange={(v) => setForm({ ...form, stockMode: v as Draft["stockMode"] })} options={[{ value: "simple", label: "Simple" }, { value: "variant", label: "Variant" }]} />
          <Field label="Stock" type="number" value={String(form.stock)} onChange={(v) => setForm({ ...form, stock: Number(v) })} />
          <SelectField
            label="Size chart"
            value={form.sizeChart}
            onChange={(v) => setForm({ ...form, sizeChart: v as Draft["sizeChart"] })}
            options={[
              { value: "apparel", label: "Apparel" },
              { value: "kids", label: "Kids" },
              { value: "none", label: "No size chart" },
            ]}
          />
        </div>
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
        <Field label="Variants JSON" value={form.variantsJson} onChange={(v) => setForm({ ...form, variantsJson: v })} textarea />
      </div>
    </Modal>
  );
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
