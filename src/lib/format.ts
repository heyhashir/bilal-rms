import { site } from "@/config/site";
import type { Product } from "@/lib/catalog-types";

export const formatPrice = (n: number) =>
  `${site.currencySymbol} ${n.toLocaleString("en-PK")}`;

export const cn = (...c: (string | false | undefined | null)[]) =>
  c.filter(Boolean).join(" ");

export const getEffectivePrice = (product: Pick<Product, "price" | "salePrice">) =>
  typeof product.salePrice === "number" && product.salePrice < product.price
    ? product.salePrice
    : product.price;

export const isDiscountedProduct = (product: Pick<Product, "price" | "salePrice">) =>
  getEffectivePrice(product) < product.price;

export const getEffectiveAmount = (price: number, salePrice?: number) =>
  typeof salePrice === "number" && salePrice < price ? salePrice : price;
