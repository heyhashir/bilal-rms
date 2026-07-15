export type CatalogListParams = {
  category?: string;
  brand?: string;
  search?: string;
  featured?: boolean;
  trending?: boolean;
  sort?: "newest" | "popular" | "price-asc" | "price-desc" | "name-asc" | "name-desc";
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  inStock?: boolean;
};
