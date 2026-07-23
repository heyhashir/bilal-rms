import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

type CatalogClient = Prisma.TransactionClient | typeof prisma;

export const productInclude = {
  category: {
    include: {
      parent: true,
    },
  },
  brand: true,
  images: true,
  commissionRule: true,
  variants: {
    include: {
      commissionRule: true,
    },
  },
} satisfies Prisma.ProductInclude;

const categoryTreeInclude = {
  children: {
    where: { isActive: true },
    orderBy: { name: 'asc' },
    include: {
      children: {
        where: { isActive: true },
        orderBy: { name: 'asc' },
      },
    },
  },
} satisfies Prisma.CategoryInclude;

export const catalogRepository = {
  listProducts: () =>
    prisma.product.findMany({
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    }),
  listActiveProducts: (filters?: {
    categorySlug?: string;
    brandSlug?: string;
    search?: string;
    featured?: boolean;
    trending?: boolean;
  }) =>
    prisma.product.findMany({
      where: {
        isActive: true,
        featured: filters?.featured,
        trending: filters?.trending,
        brand: filters?.brandSlug ? { slug: filters.brandSlug } : undefined,
        AND: [
          ...(filters?.categorySlug
            ? [
                {
                  OR: [
                    { category: { slug: filters.categorySlug } },
                    { category: { parent: { slug: filters.categorySlug } } },
                  ],
                },
              ]
            : []),
          ...(filters?.search
            ? [
                {
                  OR: [
                    { name: { contains: filters.search } },
                    { description: { contains: filters.search } },
                  ],
                },
              ]
            : []),
        ],
      },
      include: productInclude,
      orderBy: { createdAt: 'desc' },
    }),
  listCategories: () =>
    prisma.category.findMany({
      where: { parentId: null },
      include: categoryTreeInclude,
      orderBy: { name: 'asc' },
    }),
  listActiveCategories: () =>
    prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: categoryTreeInclude,
      orderBy: { name: 'asc' },
    }),
  listBrands: () =>
    prisma.brand.findMany({
      orderBy: { name: 'asc' },
    }),
  listActiveBrands: () =>
    prisma.brand.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  findStoreSettings: () =>
    prisma.storeSetting.findFirstOrThrow(),
  listActiveShippingZones: () =>
    prisma.shippingZone.findMany({
      where: { isActive: true },
      orderBy: { city: 'asc' },
    }),
  findActiveProductBySlug: (slug: string) =>
    prisma.product.findFirstOrThrow({
      where: {
        slug,
        isActive: true,
      },
      include: productInclude,
    }),
  findCategoryBySlug: (slug: string) =>
    prisma.category.findUniqueOrThrow({
      where: { slug },
    }),
  findCategoryById: (id: string) =>
    prisma.category.findUnique({
      where: { id },
    }),
  findBrandBySlug: (slug: string) =>
    prisma.brand.findUnique({
      where: { slug },
    }),
  findProductsByIds: (ids: string[]) =>
    prisma.product.findMany({
      where: { id: { in: ids } },
      include: productInclude,
    }),
  createProduct: (client: CatalogClient, data: Prisma.ProductUncheckedCreateInput) =>
    client.product.create({ data }),
  updateProduct: (client: CatalogClient, id: string, data: Prisma.ProductUncheckedUpdateInput) =>
    client.product.update({
      where: { id },
      data,
    }),
  findProductById: (id: string) =>
    prisma.product.findUniqueOrThrow({
      where: { id },
      include: productInclude,
    }),
  replaceProductImages: (client: CatalogClient, productId: string, paths: string[]) =>
    client.productImage.deleteMany({ where: { productId } }).then(async () => {
      if (paths.length === 0) {
        return;
      }

      await client.productImage.createMany({
        data: paths.map((image, index) => ({
          productId,
          path: image,
          sortOrder: index,
        })),
      });
    }),
  deleteProductVariants: (client: CatalogClient, productId: string) =>
    client.productVariant.deleteMany({
      where: { productId },
    }),
  createProductVariant: (
    client: CatalogClient,
    data: Prisma.ProductVariantUncheckedCreateInput,
  ) => client.productVariant.create({ data }),
  updateProductCodes: (client: CatalogClient, productId: string, data: { barcode?: string | null; qrCode?: string | null }) =>
    client.product.update({
      where: { id: productId },
      data,
    }),
  updateProductVariantCodes: (
    client: CatalogClient,
    variantId: string,
    data: { barcode?: string | null; qrCode?: string | null },
  ) =>
    client.productVariant.update({
      where: { id: variantId },
      data,
    }),
  deleteCommissionRulesForProduct: (client: CatalogClient, productId: string) =>
    client.commissionRule.deleteMany({
      where: { productId },
    }),
  deleteCommissionRulesForVariant: (client: CatalogClient, variantId: string) =>
    client.commissionRule.deleteMany({
      where: { variantId },
    }),
  upsertCommissionRuleForProduct: (client: CatalogClient, productId: string, rate: number) =>
    client.commissionRule.upsert({
      where: { productId },
      update: { rate, isActive: true },
      create: { productId, rate },
    }),
  upsertCommissionRuleForVariant: (client: CatalogClient, variantId: string, rate: number) =>
    client.commissionRule.upsert({
      where: { variantId },
      update: { rate, isActive: true },
      create: { variantId, rate },
    }),
  archiveProduct: (id: string) =>
    prisma.product.update({
      where: { id },
      data: { isActive: false },
    }),
  upsertCategory: (input: {
    slug: string;
    name: string;
    description?: string;
    parentId?: string | null;
    isActive?: boolean;
  }) =>
    prisma.category.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        description: input.description || '',
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
      },
      create: {
        slug: input.slug,
        name: input.name,
        description: input.description || '',
        parentId: input.parentId ?? null,
        isActive: input.isActive ?? true,
      },
    }),
  countProductsByCategorySlug: (slug: string) =>
    prisma.product.count({
      where: {
        OR: [
          { category: { slug } },
          { category: { parent: { slug } } },
        ],
      },
    }),
  archiveCategoryBySlug: (slug: string) =>
    prisma.category.update({
      where: { slug },
      data: { isActive: false },
    }),
  upsertBrand: (input: {
    slug: string;
    name: string;
    country?: string;
    website?: string;
    isActive: boolean;
  }) =>
    prisma.brand.upsert({
      where: { slug: input.slug },
      update: {
        name: input.name,
        country: input.country || null,
        website: input.website || null,
        isActive: input.isActive,
      },
      create: {
        slug: input.slug,
        name: input.name,
        country: input.country || null,
        website: input.website || null,
        isActive: input.isActive,
      },
    }),
  archiveBrandBySlug: (slug: string) =>
    prisma.brand.update({
      where: { slug },
      data: { isActive: false },
    }),
};
