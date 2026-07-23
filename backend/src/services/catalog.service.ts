import { catalogRepository } from '../repositories/catalog.repository';

export const catalogService = {
  async getBootstrap() {
    const [settings, categories, brands, products, shippingZones] = await Promise.all([
      catalogRepository.findStoreSettings(),
      catalogRepository.listActiveCategories(),
      catalogRepository.listActiveBrands(),
      catalogRepository.listActiveProducts(),
      catalogRepository.listActiveShippingZones(),
    ]);

    return {
      settings,
      categories,
      brands,
      products,
      shippingZones,
    };
  },
  listProducts(filters: {
    categorySlug?: string;
    brandSlug?: string;
    search?: string;
    featured?: boolean;
    trending?: boolean;
    sort?: 'newest' | 'popular' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
    minPrice?: number;
    maxPrice?: number;
    size?: string;
    color?: string;
    inStock?: boolean;
  }) {
    const normalizedSize = filters.size?.trim().toLowerCase();
    const normalizedColor = filters.color?.trim().toLowerCase();

    return catalogRepository.listActiveProducts(filters).then((products) =>
      products
        .filter((product) => {
          const effectivePrice = Number(product.salePrice ?? product.price);
          if (typeof filters.minPrice === 'number' && effectivePrice < filters.minPrice) {
            return false;
          }

          if (typeof filters.maxPrice === 'number' && effectivePrice > filters.maxPrice) {
            return false;
          }

          if (filters.inStock) {
            const inStock =
              product.stockMode === 'VARIANT'
                ? product.variants.some((variant) => variant.isActive && variant.stock > 0)
                : product.stock > 0;
            if (!inStock) {
              return false;
            }
          }

          if (normalizedSize) {
            const hasSize =
              product.variants.some((variant) => variant.isActive && variant.size.toLowerCase() === normalizedSize) ||
              (Array.isArray(product.sizesJson) &&
                product.sizesJson.some((value) => typeof value === 'string' && value.toLowerCase() === normalizedSize));
            if (!hasSize) {
              return false;
            }
          }

          if (normalizedColor) {
            const hasColor =
              product.variants.some((variant) => variant.isActive && variant.colorName.toLowerCase() === normalizedColor) ||
              (Array.isArray(product.colorsJson) &&
                product.colorsJson.some(
                  (value) =>
                    typeof value === 'object' &&
                    value !== null &&
                    'name' in value &&
                    typeof value.name === 'string' &&
                    value.name.toLowerCase() === normalizedColor,
                ));
            if (!hasColor) {
              return false;
            }
          }

          return true;
        })
        .sort((left, right) => {
          const leftPrice = Number(left.salePrice ?? left.price);
          const rightPrice = Number(right.salePrice ?? right.price);

          switch (filters.sort) {
            case 'price-asc':
              return leftPrice - rightPrice;
            case 'price-desc':
              return rightPrice - leftPrice;
            case 'name-asc':
              return left.name.localeCompare(right.name);
            case 'name-desc':
              return right.name.localeCompare(left.name);
            case 'popular':
              return Number(right.trending) - Number(left.trending) || right.createdAt.getTime() - left.createdAt.getTime();
            default:
              return right.createdAt.getTime() - left.createdAt.getTime();
          }
        }),
    );
  },
  async listSaleProducts(filters: {
    sort?: 'newest' | 'popular' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc';
  }) {
    const products = await catalogRepository.listActiveProducts();
    const saleProducts = products.filter((product) => {
      const price = Number(product.price);
      const salePrice = product.salePrice ? Number(product.salePrice) : null;
      return salePrice !== null && salePrice < price;
    });

    return saleProducts.sort((left, right) => {
      const leftPrice = Number(left.salePrice ?? left.price);
      const rightPrice = Number(right.salePrice ?? right.price);

      switch (filters.sort) {
        case 'price-asc':
          return leftPrice - rightPrice;
        case 'price-desc':
          return rightPrice - leftPrice;
        case 'name-asc':
          return left.name.localeCompare(right.name);
        case 'name-desc':
          return right.name.localeCompare(left.name);
        case 'popular':
          return Number(right.trending) - Number(left.trending) || right.createdAt.getTime() - left.createdAt.getTime();
        default:
          return right.createdAt.getTime() - left.createdAt.getTime();
      }
    });
  },
  getProduct(slug: string) {
    return catalogRepository.findActiveProductBySlug(slug);
  },
  listCategories() {
    return catalogRepository.listActiveCategories();
  },
  listBrands() {
    return catalogRepository.listActiveBrands();
  },
  getSettings() {
    return catalogRepository.findStoreSettings();
  },
  listShippingZones() {
    return catalogRepository.listActiveShippingZones();
  },
};
