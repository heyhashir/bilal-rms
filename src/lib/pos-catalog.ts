import type { Product } from "@/lib/catalog-types";
import { getEffectiveAmount } from "@/lib/format";

export type SaleChoice = {
  key: string;
  productId: string;
  variantId?: string;
  label: string;
  subtitle: string;
  unitPrice: number;
  stock: number;
  image: string;
  barcode: string;
  sku: string;
  qrCode: string;
  supplierBarcode: string;
  productCodes: string[];
  size: string;
  color: string;
  brand: string;
  category: string;
};

export function buildSaleChoices(products: Product[]): SaleChoice[] {
  return products.filter((product) => product.isActive !== false).flatMap<SaleChoice>((product) => {
    const common = {
      productId: product.id,
      label: product.name,
      image: product.images[0] ?? "",
      brand: product.brandName ?? "",
      category: product.categoryName,
      productCodes: [product.barcode, product.qrCode, product.supplierBarcode, product.slug].filter((code): code is string => Boolean(code)),
    };
    if (product.stockMode === "variant") {
      return product.variants.filter((variant) => variant.isActive).map((variant) => ({
        ...common,
        key: `${product.id}:${variant.id}`,
        variantId: variant.id,
        subtitle: [variant.sku, variant.size, variant.colorName].filter(Boolean).join(" | "),
        unitPrice: variant.priceOverride ?? getEffectiveAmount(product.price, product.salePrice),
        stock: variant.stock,
        barcode: variant.barcode || variant.sku,
        sku: variant.sku,
        qrCode: variant.qrCode ?? "",
        supplierBarcode: variant.supplierBarcode ?? "",
        size: variant.size,
        color: variant.colorName,
      }));
    }
    return [{
      ...common,
      key: product.id,
      subtitle: product.slug,
      unitPrice: getEffectiveAmount(product.price, product.salePrice),
      stock: product.stock,
      barcode: product.barcode ?? "",
      sku: product.slug,
      qrCode: product.qrCode ?? "",
      supplierBarcode: product.supplierBarcode ?? "",
      size: "",
      color: "",
    }];
  });
}

const normalizeCode = (value: string) => value.trim().replace(/^#\s*/, "").toLowerCase();

export function matchSaleChoices(query: string, choices: SaleChoice[]): SaleChoice[] {
  const term = normalizeCode(query);
  if (!term) return choices;

  // A shared product code must offer variant selection, never pick the first size/color.
  for (const field of ["barcode", "sku", "qrCode", "supplierBarcode"] as const) {
    const exact = choices.filter((choice) => normalizeCode(choice[field]) === term);
    if (exact.length) return exact;
  }
  const productMatches = choices.filter((choice) => choice.productCodes.some((code) => normalizeCode(code) === term));
  if (productMatches.length) return productMatches;
  const nameMatches = choices.filter((choice) => normalizeCode(choice.label) === term);
  if (nameMatches.length) return nameMatches;

  const words = term.split(/\s+/);
  return choices.filter((choice) => {
    const text = `${choice.label} ${choice.subtitle} ${choice.sku} ${choice.barcode} ${choice.qrCode} ${choice.supplierBarcode} ${choice.productCodes.join(" ")} ${choice.brand} ${choice.category} ${choice.size} ${choice.color}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
}
