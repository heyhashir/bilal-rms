import { Request, Response } from 'express';
import { catalogService } from '../services/catalog.service';
import { ApiResponse } from '../utils/ApiResponse';
import {
  serializeBrand,
  serializeCategory,
  serializeProduct,
  serializeSettings,
  serializeShippingZone,
} from '../utils/serializers';

export const getCatalogBootstrap = async (_req: Request, res: Response) => {
  const { settings, categories, brands, products, shippingZones } = await catalogService.getBootstrap();

  res.status(200).json(
    ApiResponse.success('Storefront data loaded', {
      settings: serializeSettings(settings),
      categories: categories.map(serializeCategory),
      brands: brands.map(serializeBrand),
      products: products.map(serializeProduct),
      shippingZones: shippingZones.map(serializeShippingZone),
    }),
  );
};

export const listCatalogProducts = async (req: Request, res: Response) => {
  const categorySlug = typeof req.query.category === 'string' ? req.query.category : undefined;
  const brandSlug = typeof req.query.brand === 'string' ? req.query.brand : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const featured = req.query.featured === 'true' ? true : undefined;
  const trending = req.query.trending === 'true' ? true : undefined;
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const minPrice = typeof req.query.minPrice === 'string' ? Number(req.query.minPrice) : undefined;
  const maxPrice = typeof req.query.maxPrice === 'string' ? Number(req.query.maxPrice) : undefined;
  const size = typeof req.query.size === 'string' ? req.query.size : undefined;
  const color = typeof req.query.color === 'string' ? req.query.color : undefined;
  const inStock = req.query.inStock === 'true' ? true : undefined;

  const products = await catalogService.listProducts({
    categorySlug,
    brandSlug,
    search,
    featured,
    trending,
    sort: sort as never,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    size,
    color,
    inStock,
  });

  res.status(200).json(
    ApiResponse.success('Products loaded', {
      products: products.map(serializeProduct),
      meta: {
        total: products.length,
        maxEffectivePrice: products.reduce(
          (max, product) => Math.max(max, Number(product.salePrice ?? product.price)),
          0,
        ),
      },
    }),
  );
};

export const listSaleProducts = async (req: Request, res: Response) => {
  const sort = typeof req.query.sort === 'string' ? req.query.sort : undefined;
  const products = await catalogService.listSaleProducts({
    sort: sort as never,
  });

  res.status(200).json(
    ApiResponse.success('Sale products loaded', {
      products: products.map(serializeProduct),
      meta: {
        total: products.length,
        maxEffectivePrice: products.reduce(
          (max, product) => Math.max(max, Number(product.salePrice ?? product.price)),
          0,
        ),
      },
    }),
  );
};

export const getCatalogProduct = async (req: Request, res: Response) => {
  const product = await catalogService.getProduct(req.params.slug);
  res.status(200).json(ApiResponse.success('Product loaded', { product: serializeProduct(product) }));
};

export const listCatalogCategories = async (_req: Request, res: Response) => {
  const categories = await catalogService.listCategories();
  res.status(200).json(ApiResponse.success('Categories loaded', { categories: categories.map(serializeCategory) }));
};

export const listCatalogBrands = async (_req: Request, res: Response) => {
  const brands = await catalogService.listBrands();
  res.status(200).json(ApiResponse.success('Brands loaded', { brands: brands.map(serializeBrand) }));
};

export const getCatalogSettings = async (_req: Request, res: Response) => {
  const settings = await catalogService.getSettings();
  res.status(200).json(ApiResponse.success('Settings loaded', { settings: serializeSettings(settings) }));
};

export const listCatalogShippingZones = async (_req: Request, res: Response) => {
  const shippingZones = await catalogService.listShippingZones();
  res.status(200).json(
    ApiResponse.success('Shipping zones loaded', {
      shippingZones: shippingZones.map(serializeShippingZone),
    }),
  );
};
