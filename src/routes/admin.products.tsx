import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Palette,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Sparkles,
  Table,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { adminCatalogApi } from "@/lib/admin-catalog-api";
import { getErrorMessage } from "@/lib/api";
import { queryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import type { Brand, Category, Product, SizeChart } from "@/lib/catalog-types";
import { ActionButton, Field, Modal, PageHeader, SelectField } from "@/components/admin/primitives";
import { formatPrice } from "@/lib/format";
import { BarcodeStickerModal } from "@/components/admin/BarcodeStickerModal";
import { sizeCharts } from "@/config/site";

export const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Off White", hex: "#FAF9F6" },
  { name: "Navy Blue", hex: "#0F172A" },
  { name: "Royal Blue", hex: "#1D4ED8" },
  { name: "Sky Blue", hex: "#38BDF8" },
  { name: "Maroon", hex: "#800020" },
  { name: "Burgundy", hex: "#581845" },
  { name: "Red", hex: "#DC2626" },
  { name: "Purple", hex: "#7E22CE" },
  { name: "Lavender", hex: "#C084FC" },
  { name: "Olive Green", hex: "#4D7C0F" },
  { name: "Bottle Green", hex: "#14532D" },
  { name: "Mint Green", hex: "#6EE7B7" },
  { name: "Beige", hex: "#D4B996" },
  { name: "Brown", hex: "#5C3A21" },
  { name: "Camel", hex: "#C19A6B" },
  { name: "Charcoal", hex: "#374151" },
  { name: "Grey", hex: "#6B7280" },
  { name: "Mustard", hex: "#CA8A04" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Peach", hex: "#FDBA74" },
];

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
  customSizeChart?: SizeChart | null;
  sizes: string[];
  colors: { name: string; hex: string; image?: string | null }[];
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
    image?: string | null;
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
  customSizeChart: product?.customSizeChart ?? null,
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
  const [sizeMode, setSizeMode] = useState<"letter" | "numeric">(
    () => draft.sizes.some((size) => /^\d/.test(size)) ? "numeric" : "letter",
  );
  const [tagText, setTagText] = useState(draft.tags.join(", "));
  const [colorName, setColorName] = useState("");
  const [colorHex, setColorHex] = useState("#000000");
  const [colorImage, setColorImage] = useState<string | null>(null);
  const [isUploadingColorImg, setIsUploadingColorImg] = useState(false);
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [showPigmentAdjuster, setShowPigmentAdjuster] = useState(false);
  const [showSizeChartCustomizer, setShowSizeChartCustomizer] = useState(Boolean(draft.customSizeChart));
  const [newColumnName, setNewColumnName] = useState("");

  const isAccessory = form.sizeChart === "none" || inferSizeChart(form.categorySlug) === "none";
  const matrixSizes = sizeText.split(",").map((value) => value.trim()).filter(Boolean);

  const getDefaultBaseChart = (): SizeChart => {
    const inferred = inferSizeChart(form.categorySlug);
    const key =
      form.sizeChart === "auto"
        ? inferred === "none"
          ? "apparel"
          : inferred
        : form.sizeChart === "none"
        ? "apparel"
        : form.sizeChart;
    return sizeCharts[key] ?? sizeCharts.apparel;
  };

  const activeCustomChart: SizeChart = form.customSizeChart ?? {
    label: form.name ? `${form.name} Size Guide` : `${getDefaultBaseChart().label} (Custom)`,
    columns: getDefaultBaseChart().columns.map((c) => ({ ...c })),
    rows: getDefaultBaseChart().rows.map((r) => ({ ...r })),
  };

  const updateCustomChart = (updater: (prev: SizeChart) => SizeChart) => {
    const updated = updater(activeCustomChart);
    setForm((current) => ({ ...current, customSizeChart: updated }));
  };

  const handleLoadPreset = (presetKey: "apparel" | "bottoms" | "kids") => {
    const preset = sizeCharts[presetKey];
    if (preset) {
      setForm((current) => ({
        ...current,
        customSizeChart: {
          label: preset.label,
          columns: preset.columns.map((c) => ({ ...c })),
          rows: preset.rows.map((r) => ({ ...r })),
        },
      }));
      toast.success(`Loaded "${preset.label}" preset into custom size guide!`);
    }
  };

  const handleResetSizeChart = () => {
    setForm((current) => ({ ...current, customSizeChart: null }));
    toast.info("Size guide reset to standard category default.");
  };

  const handleAddColumn = () => {
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, "_") || `col_${Date.now()}`;
    if (activeCustomChart.columns.some((c) => c.key === key)) {
      toast.error(`Column "${trimmed}" already exists`);
      return;
    }
    updateCustomChart((prev) => ({
      ...prev,
      columns: [...prev.columns, { key, label: trimmed }],
      rows: prev.rows.map((r) => ({ ...r, [key]: "-" })),
    }));
    setNewColumnName("");
    toast.success(`Added column "${trimmed}"`);
  };

  const handleRemoveColumn = (colKey: string) => {
    if (colKey === "size") {
      toast.error("The Size column cannot be removed.");
      return;
    }
    updateCustomChart((prev) => ({
      ...prev,
      columns: prev.columns.filter((c) => c.key !== colKey),
      rows: prev.rows.map((r) => {
        const copy = { ...r };
        delete copy[colKey];
        return copy;
      }),
    }));
  };

  const handleUpdateColumnLabel = (index: number, label: string) => {
    updateCustomChart((prev) => {
      const columns = [...prev.columns];
      columns[index] = { ...columns[index], label };
      return { ...prev, columns };
    });
  };

  const handleAddRow = () => {
    const newSizeLabel = `Size ${activeCustomChart.rows.length + 1}`;
    const newRow: Record<string, string> = { size: newSizeLabel };
    activeCustomChart.columns.forEach((c) => {
      if (c.key !== "size") newRow[c.key] = "-";
    });
    updateCustomChart((prev) => ({
      ...prev,
      rows: [...prev.rows, newRow],
    }));
  };

  const handleUpdateCell = (rowIndex: number, colKey: string, value: string) => {
    updateCustomChart((prev) => {
      const rows = [...prev.rows];
      rows[rowIndex] = { ...rows[rowIndex], [colKey]: value };
      return { ...prev, rows };
    });
  };

  const handleRemoveRow = (rowIndex: number) => {
    if (activeCustomChart.rows.length <= 1) {
      toast.error("Size guide must have at least one row.");
      return;
    }
    updateCustomChart((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, idx) => idx !== rowIndex),
    }));
  };

  const buildVariantMatrix = () => {
    const sizes = isAccessory ? ["Standard"] : matrixSizes;
    if (sizes.length === 0 || form.colors.length === 0) {
      return null;
    }

    const existingByKey = new Map(
      form.variants.map((variant) => [variantMatrixKey(variant.size, variant.colorName), variant]),
    );
    const variants = sizes.flatMap((size) =>
      form.colors.map((color) => {
        const existing = existingByKey.get(variantMatrixKey(size, color.name));
        if (existing) {
          return {
            ...existing,
            size,
            colorName: color.name,
            colorHex: color.hex,
            image: existing.image ?? color.image ?? null,
            isActive: true,
          };
        }

        const sku = makeVariantSku(form.slug || form.name, color.name, size);
        return {
          sku,
          size,
          colorName: color.name,
          colorHex: color.hex,
          image: color.image ?? null,
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

  const updateVariantStock = (matrixKey: string, stock: number) => {
    setForm((current) => ({
      ...current,
      variants: current.variants.map((variant) =>
        variantMatrixKey(variant.size, variant.colorName) === matrixKey
          ? { ...variant, stock: Math.max(0, stock) }
          : variant,
      ),
    }));
  };

  const selectSizeMode = (nextMode: "letter" | "numeric") => {
    setSizeMode(nextMode);
    setSizeText(nextMode === "numeric" ? "28, 30, 32, 34, 36" : "S, M, L, XL");
  };

  const selectPresetColor = (preset: { name: string; hex: string }) => {
    setColorName(preset.name);
    setColorHex(preset.hex);
    setShowCustomColor(false);
  };

  const addColor = () => {
    const name = colorName.trim();
    if (!name) {
      toast.error("Please enter or pick a color");
      return;
    }
    if (form.colors.some((color) => color.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
      toast.error("That color is already added");
      return;
    }
    setForm({ ...form, colors: [...form.colors, { name, hex: colorHex, image: colorImage }] });
    setColorName("");
    setColorImage(null);
    setShowPigmentAdjuster(false);
  };

  const colorChips = form.colors.length > 0 && (
    <div className="mt-2 flex flex-wrap gap-2">
      {form.colors.map((color, index) => (
        <span key={`${color.name}-${index}`} className="inline-flex items-center gap-2 border border-border bg-background px-2.5 py-1 text-xs">
          <span className="h-3.5 w-3.5 rounded-full border border-black/20" style={{ background: color.hex }} />
          <span className="font-medium">{color.name}</span>
          {color.image ? (
            <img src={color.image} alt="" className="h-5 w-5 rounded object-cover border border-border" />
          ) : (
            <span className="text-[10px] text-muted-foreground">(No photo)</span>
          )}
          <button
            type="button"
            onClick={() => setForm({ ...form, colors: form.colors.filter((_, colorIndex) => colorIndex !== index) })}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
    </div>
  );

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
        (!variantId && variantMatrixKey(variant.size, variant.colorName) === variantMatrixKey(size, colorName))
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
      const sizes = isAccessory ? ["Standard"] : matrixSizes;
      const variants = form.stockMode === "variant" ? form.variants : [];
      const result = await adminCatalogApi.saveProduct({
        ...form,
        sizes,
        tags: tagText.split(",").map((v) => v.trim()).filter(Boolean),
        variants,
        customSizeChart: form.customSizeChart ?? null,
      }, form.id);
      toast.success(form.id ? "Product updated" : "Product created");
      await invalidateCatalogAfterMutation();
      onSave(result.product);
    } catch (error) {
      toast.error(getErrorMessage(error, "Unable to save product"));
    }
  };

  const colorEditor = (
    <div className="space-y-3 rounded-lg border border-border bg-secondary/20 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="block text-xs uppercase tracking-widest font-semibold text-foreground">
          {form.stockMode === "variant" ? (isAccessory ? "1. Select Colors" : "2. Select Colors") : "Colors & Variant Photos"}
        </span>
        <button
          type="button"
          onClick={() => {
            setShowCustomColor((prev) => !prev);
            if (!showCustomColor) {
              setShowPigmentAdjuster(true);
            }
          }}
          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border transition-colors ${
            showCustomColor
              ? "border-foreground bg-foreground text-background"
              : "border-border bg-background hover:bg-muted text-foreground"
          }`}
        >
          <Palette className="h-3.5 w-3.5" />
          {showCustomColor ? "Hide Custom Picker" : "+ Custom Color"}
        </button>
      </div>

      {/* Basic Preset Swatches */}
      <div>
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Basic Colors (Click to choose)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_COLORS.map((preset) => {
            const isSelected = colorName.toLowerCase() === preset.name.toLowerCase() && !showCustomColor;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => selectPresetColor(preset)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all ${
                  isSelected
                    ? "border-foreground bg-foreground text-background font-bold shadow-sm"
                    : "border-border bg-background hover:border-foreground/40 text-foreground"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full border border-black/20 shrink-0"
                  style={{ backgroundColor: preset.hex }}
                />
                <span>{preset.name}</span>
                {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Color Details & Pigment Adjustment Box */}
      {(colorName || showCustomColor) && (
        <div className="rounded border border-border bg-background p-3 space-y-3 mt-2 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="h-8 w-8 rounded-full border border-border shrink-0 shadow-inner"
                style={{ backgroundColor: colorHex }}
              />
              <input
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
                placeholder="Color name (e.g. Maroon, Purple, Olive)"
                className="h-9 min-w-0 flex-1 border border-border bg-background px-3 text-xs font-semibold uppercase outline-none focus:border-foreground rounded"
              />
            </div>

            {/* Adjust Pigment Button */}
            <button
              type="button"
              onClick={() => setShowPigmentAdjuster((prev) => !prev)}
              className={`inline-flex h-9 items-center gap-1.5 rounded border px-3 text-xs font-medium transition-colors ${
                showPigmentAdjuster
                  ? "border-primary bg-primary/10 text-primary font-bold"
                  : "border-border bg-secondary hover:bg-muted text-foreground"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>{showPigmentAdjuster ? "Hide Pigments" : "Adjust Pigments"}</span>
            </button>

            {/* Variant Photo Upload */}
            <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded border border-border bg-secondary px-3 text-xs uppercase tracking-wider hover:bg-muted">
              {colorImage ? (
                <img src={colorImage} alt="" className="h-5 w-5 rounded object-cover" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              <span>{colorImage ? "Photo added" : "Color photo"}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setIsUploadingColorImg(true);
                    const payload = await adminCatalogApi.uploadProductImage(file);
                    setColorImage(payload.path);
                    toast.success("Color photo uploaded");
                  } catch (err) {
                    toast.error(getErrorMessage(err, "Failed to upload photo"));
                  } finally {
                    setIsUploadingColorImg(false);
                  }
                }}
              />
            </label>
            {colorImage && (
              <button
                type="button"
                onClick={() => setColorImage(null)}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}

            {/* Add Button */}
            <button
              type="button"
              onClick={addColor}
              className="h-9 shrink-0 rounded bg-foreground text-background px-4 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              Add Color
            </button>
          </div>

          {/* Expanded Pigment Adjustment Controls */}
          {showPigmentAdjuster && (
            <div className="rounded border border-dashed border-border bg-secondary/30 p-2.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Pigment & Tone Fine-Tuning
                </span>
                <span className="font-mono text-[11px] font-bold text-foreground">{colorHex.toUpperCase()}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">Spectrum Picker:</span>
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-8 w-14 cursor-pointer rounded border border-border bg-background p-0.5"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Hex Code:</span>
                  <input
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    placeholder="#800020"
                    className="h-8 w-24 rounded border border-border bg-background px-2 font-mono text-xs uppercase outline-none focus:border-foreground"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Added Color Chips */}
      {colorChips}
    </div>
  );

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
          <SelectField label="Brand" value={form.brandSlug} onChange={(v) => setForm((current) => ({ ...current, brandSlug: v }))} options={[{ value: "", label: "No brand" }, ...brands.map((brand) => ({ value: brand.slug, label: brand.name }))]} />
          <Field label="Price" type="number" value={String(form.price)} onChange={(v) => setForm((current) => ({ ...current, price: Number(v) }))} />
          <Field label="Sale price" type="number" value={String(form.salePrice ?? "")} onChange={(v) => setForm((current) => ({ ...current, salePrice: v ? Number(v) : undefined }))} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Barcode" value={form.barcode} onChange={(v) => setForm((current) => ({ ...current, barcode: v }))} />
          <Field label="QR code" value={form.qrCode} onChange={(v) => setForm((current) => ({ ...current, qrCode: v }))} />
          <Field label="Supplier barcode" value={form.supplierBarcode} onChange={(v) => setForm((current) => ({ ...current, supplierBarcode: v }))} />
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
        <div className="grid gap-3 md:grid-cols-2">
          <SelectField
            label="Stock mode"
            value={form.stockMode}
            onChange={(v) => setForm((current) => ({ ...current, stockMode: v as Draft["stockMode"] }))}
            options={[{ value: "simple", label: "Simple" }, { value: "variant", label: "Variant" }]}
          />
          {form.stockMode === "simple" ? (
            <Field label="Stock" type="number" value={String(form.stock)} onChange={(v) => setForm((current) => ({ ...current, stock: Number(v) }))} />
          ) : (
            <div className="border border-border bg-secondary px-3 py-2 text-sm">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Variant stock</div>
              <div className="mt-1 font-semibold">
                {form.variants.length > 0
                  ? `${form.variants.reduce((sum, variant) => sum + variant.stock, 0)} units`
                  : "Not configured"}
              </div>
            </div>
          )}
        </div>

        {/* Size Chart / Guide Selector & Optional Customizer */}
        <div className="space-y-3 rounded-lg border border-border bg-secondary/15 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-[220px]">
              <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                Size Chart / Guide Base
              </span>
              <select
                value={form.sizeChart}
                onChange={(e) => setForm((current) => ({ ...current, sizeChart: e.target.value as Draft["sizeChart"] }))}
                className="h-10 w-full rounded border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
              >
                <option value="auto">Auto by category</option>
                <option value="apparel">Apparel (Standard)</option>
                <option value="bottoms">Jeans / Bottoms</option>
                <option value="kids">Kids</option>
                <option value="none">No size chart</option>
              </select>
            </div>

            {form.sizeChart !== "none" && (
              <div className="flex items-center gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => setShowSizeChartCustomizer(!showSizeChartCustomizer)}
                  className={`inline-flex items-center gap-2 rounded px-3.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition border ${
                    form.customSizeChart
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                      : showSizeChartCustomizer
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-secondary"
                  }`}
                >
                  <Ruler className="h-4 w-4" />
                  {form.customSizeChart ? "Custom Guide Active (Edit)" : "📐 Customize Size Chart (Optional)"}
                  {showSizeChartCustomizer ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
          </div>
          {/* Collapsible Size Guide Customizer Editor */}
          {form.sizeChart !== "none" && showSizeChartCustomizer && (
            <div className="mt-4 space-y-4 rounded-md border border-border bg-background p-4 animate-in fade-in-50 duration-200">
              {/* Header: Title & Presets */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    Size Guide Modal Title
                  </label>
                  <input
                    value={activeCustomChart.label}
                    onChange={(e) => updateCustomChart((prev) => ({ ...prev, label: e.target.value }))}
                    placeholder="e.g. Men Kurta Measurements (cm)"
                    className="h-9 w-full rounded border border-border bg-secondary/20 px-3 text-sm outline-none focus:border-foreground"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Load Preset:</span>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("apparel")}
                    className="rounded border border-border bg-secondary/50 px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary"
                  >
                    Apparel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("bottoms")}
                    className="rounded border border-border bg-secondary/50 px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary"
                  >
                    Bottoms
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadPreset("kids")}
                    className="rounded border border-border bg-secondary/50 px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary"
                  >
                    Kids
                  </button>
                  {form.customSizeChart && (
                    <button
                      type="button"
                      onClick={handleResetSizeChart}
                      className="inline-flex items-center gap-1 rounded border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/20"
                    >
                      <RotateCcw className="h-3 w-3" /> Reset Default
                    </button>
                  )}
                </div>
              </div>

              {/* Columns Editor */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    1. Columns & Measurement Names
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Click any column name to rename, or remove with (✕)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {activeCustomChart.columns.map((col, colIdx) => (
                    <div
                      key={col.key}
                      className="inline-flex items-center rounded border border-border bg-secondary/40 px-2 py-1 text-xs gap-1.5"
                    >
                      <input
                        value={col.label}
                        onChange={(e) => handleUpdateColumnLabel(colIdx, e.target.value)}
                        className="w-24 bg-transparent text-xs font-semibold outline-none focus:bg-background focus:ring-1 focus:ring-foreground rounded px-1"
                        placeholder="Column name"
                      />
                      {col.key !== "size" && (
                        <button
                          type="button"
                          onClick={() => handleRemoveColumn(col.key)}
                          className="text-muted-foreground hover:text-rose-500"
                          title="Remove column"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add Column Form */}
                  <div className="inline-flex items-center gap-1.5">
                    <input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddColumn();
                        }
                      }}
                      placeholder="+ New Column (e.g. Collar)"
                      className="h-7 w-36 rounded border border-dashed border-border bg-background px-2 text-xs outline-none focus:border-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="h-7 rounded bg-secondary px-2.5 text-xs font-semibold uppercase hover:bg-muted"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Rows & Measurements Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                    2. Rows & Measurements Matrix
                  </span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Size Row
                  </button>
                </div>

                <div className="overflow-x-auto rounded border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-secondary/40 text-muted-foreground">
                      <tr>
                        {activeCustomChart.columns.map((col) => (
                          <th key={col.key} className="py-2 px-2.5 text-left font-semibold">
                            {col.label}
                          </th>
                        ))}
                        <th className="w-8 py-2 px-2 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {activeCustomChart.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="hover:bg-secondary/20">
                          {activeCustomChart.columns.map((col) => (
                            <td key={col.key} className="p-1.5">
                              <input
                                value={row[col.key] ?? ""}
                                onChange={(e) => handleUpdateCell(rowIdx, col.key, e.target.value)}
                                placeholder="-"
                                className={`h-7 w-full rounded border border-border/60 bg-background px-2 text-xs outline-none focus:border-foreground ${
                                  col.key === "size" ? "font-bold text-foreground" : "text-muted-foreground"
                                }`}
                              />
                            </td>
                          ))}
                          <td className="p-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIdx)}
                              className="text-muted-foreground hover:text-rose-500"
                              title="Delete row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>
        {form.stockMode === "variant" && (
          <section className="space-y-4 border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Variant configuration</div>
                <div className="mt-1 text-sm text-muted-foreground">Sizes are rows, colors are columns, and each cell is independent stock.</div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {isAccessory ? (
                <div className="border border-border bg-secondary px-3 py-2 text-sm">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Size</div>
                  <div className="mt-1 font-semibold">Standard</div>
                </div>
              ) : (
                <div>
                  <span className="mb-1.5 block text-xs uppercase tracking-widest text-muted-foreground">1. Sizes (comma separated)</span>
                  <input
                    value={sizeText}
                    onChange={(event) => setSizeText(event.target.value)}
                    placeholder="S, M, L, XL or 28, 30, 32, 34, 36"
                    className="h-10 w-full border border-border bg-background px-3 text-sm outline-none focus:border-foreground"
                  />
                  <div className="mt-2 inline-flex overflow-hidden border border-border text-xs uppercase tracking-wider">
                    <button
                      type="button"
                      aria-pressed={sizeMode === "letter"}
                      onClick={() => selectSizeMode("letter")}
                      className={`px-3 py-2 ${sizeMode === "letter" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"}`}
                    >
                      Letter: S/M/L
                    </button>
                    <button
                      type="button"
                      aria-pressed={sizeMode === "numeric"}
                      onClick={() => selectSizeMode("numeric")}
                      className={`border-l border-border px-3 py-2 ${sizeMode === "numeric" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-secondary"}`}
                    >
                      Numeric: 28-36
                    </button>
                  </div>
                </div>
              )}
              <div className="md:col-span-2">
                {colorEditor}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <p className="text-sm text-muted-foreground">
                Generate the matrix after adding sizes and colors, then enter stock in each cell.
              </p>
              <ActionButton variant="ghost" onClick={generateVariantMatrix}>
                {isAccessory ? "2. Generate matrix" : "3. Generate matrix"}
              </ActionButton>
            </div>
            {form.variants.length > 0 && (
              <div className="space-y-5">
              <div className="overflow-x-auto border border-border">
                <table className="min-w-[520px] w-full table-fixed text-sm">
                  <thead className="bg-secondary text-xs uppercase tracking-widest">
                    <tr>
                      <th className="sticky left-0 z-20 w-28 bg-secondary p-3 text-left">Size</th>
                      {form.colors.map((color) => <th key={color.name} className="min-w-32 p-3 text-center">{color.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(isAccessory ? ["Standard"] : matrixSizes).map((size) => (
                      <tr key={size} className="border-t border-border">
                        <th className="sticky left-0 z-10 w-28 bg-background p-3 text-left font-medium">{size}</th>
                        {form.colors.map((color) => {
                          const matrixKey = variantMatrixKey(size, color.name);
                          const variant = form.variants.find((entry) => variantMatrixKey(entry.size, entry.colorName) === matrixKey);
                          return (
                            <td key={matrixKey} className="p-2 text-center">
                              <input
                                type="number"
                                min={0}
                                value={variant?.stock ?? 0}
                                disabled={!variant}
                                onChange={(event) => updateVariantStock(matrixKey, Number(event.target.value) || 0)}
                                className="w-full max-w-28 border border-border bg-background px-3 py-2 text-center"
                                aria-label={`${size} ${color.name} stock`}
                              />
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
                  <table className="min-w-[1240px] w-full text-xs">
                    <thead className="bg-secondary uppercase tracking-widest">
                      <tr>
                        <th className="p-2 text-left">Variant</th>
                        <th className="p-2 text-left">Photo (Optional)</th>
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
                            <div className="flex items-center gap-1.5">
                              {variant.image ? (
                                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded border border-border bg-secondary">
                                  <img src={variant.image} alt="" className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => updateVariant(variant.id, variant.size, variant.colorName, { image: null })}
                                    className="absolute right-0 top-0 rounded-full bg-black/75 p-0.5 text-white hover:bg-black"
                                    title="Remove photo"
                                  >
                                    <X className="h-2 w-2" />
                                  </button>
                                </div>
                              ) : (
                                <div className="h-8 w-8 shrink-0 rounded border border-dashed border-border bg-secondary/30 grid place-items-center text-[9px] text-muted-foreground">
                                  None
                                </div>
                              )}
                              <label className="cursor-pointer rounded bg-secondary px-2 py-1 text-[10px] uppercase tracking-wider hover:bg-muted">
                                {variant.image ? "Change" : "Upload"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    try {
                                      const payload = await adminCatalogApi.uploadProductImage(file);
                                      updateVariant(variant.id, variant.size, variant.colorName, { image: payload.path });
                                      toast.success("Variant photo updated");
                                    } catch (err) {
                                      toast.error(getErrorMessage(err, "Failed to upload photo"));
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </td>
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
        {form.stockMode !== "variant" && !isAccessory && <Field label="Sizes (comma separated)" value={sizeText} onChange={setSizeText} />}
        <Field label="Tags (comma separated)" value={tagText} onChange={setTagText} />
        {form.stockMode !== "variant" && colorEditor}
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

const variantMatrixKey = (size: string, color: string) =>
  `${size.trim().toLocaleLowerCase()}::${color.trim().toLocaleLowerCase()}`;

const inferSizeChart = (categorySlug: string): "apparel" | "bottoms" | "kids" | "none" => {
  const slug = categorySlug.toLowerCase();
  if (slug === "accessories" || /accessor|watch|belt|cap|scarf|sock/.test(slug)) return "none";
  if (slug === "kids" || /kid|boy|girl|infant/.test(slug)) return "kids";
  if (/jean|bottom|trouser|pant/.test(slug)) return "bottoms";
  return "apparel";
};
