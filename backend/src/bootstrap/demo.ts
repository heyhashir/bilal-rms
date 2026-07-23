import prisma from '../config/prisma';
import { bootstrapData } from './seed';

const demoBrands = [
  { slug: 'bilal-essentials', name: 'Bilal Essentials', country: 'Pakistan' },
  { slug: 'atelier-lahore', name: 'Atelier Lahore', country: 'Pakistan' },
  { slug: 'junior-club', name: 'Junior Club', country: 'Pakistan' },
];

const demoProducts = [
  {
    slug: 'classic-oxford-shirt',
    name: 'Classic Oxford Shirt',
    category: 'men',
    brand: 'atelier-lahore',
    stockMode: 'VARIANT' as const,
    price: 4990,
    salePrice: 3990,
    description: 'A crisp everyday Oxford shirt with a relaxed modern fit and a soft, breathable finish.',
    tags: ['shirts', 'office', 'new arrival'],
    featured: true,
    trending: true,
    barcode: 'BG-100001',
    qrCode: 'BGQR-100001',
    commissionRate: 5,
    images: [
      'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1598032895397-b9472444bf93?auto=format&fit=crop&w=900&q=85',
    ],
    variants: [
      { sku: 'BG-OXF-WHT-M', size: 'M', colorName: 'White', colorHex: '#F5F2EB', stock: 12, barcode: 'BG-100001-M', qrCode: 'BGQR-100001-M' },
      { sku: 'BG-OXF-WHT-L', size: 'L', colorName: 'White', colorHex: '#F5F2EB', stock: 10, barcode: 'BG-100001-L', qrCode: 'BGQR-100001-L' },
      { sku: 'BG-OXF-BLU-M', size: 'M', colorName: 'Sky Blue', colorHex: '#9FC5E8', stock: 8, barcode: 'BG-100001-BM', qrCode: 'BGQR-100001-BM' },
    ],
  },
  {
    slug: 'heavyweight-cotton-tee',
    name: 'Heavyweight Cotton Tee',
    category: 'men',
    brand: 'bilal-essentials',
    stockMode: 'SIMPLE' as const,
    price: 2490,
    salePrice: null,
    stock: 36,
    description: 'A structured heavyweight cotton tee cut for everyday wear. Soft, durable, and easy to layer.',
    tags: ['t-shirts', 'essentials'],
    featured: true,
    trending: true,
    barcode: 'BG-100002',
    qrCode: 'BGQR-100002',
    commissionRate: 3,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85',
    ],
  },
  {
    slug: 'linen-co-ord-set',
    name: 'Linen Co-ord Set',
    category: 'women',
    brand: 'atelier-lahore',
    stockMode: 'VARIANT' as const,
    price: 7990,
    salePrice: 6990,
    description: 'An easy linen-blend matching set with a fluid silhouette for polished warm-weather dressing.',
    tags: ['co-ords', 'linen', 'women'],
    featured: true,
    trending: false,
    barcode: 'BG-100003',
    qrCode: 'BGQR-100003',
    commissionRate: 5,
    images: [
      'https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=85',
    ],
    variants: [
      { sku: 'BG-LIN-SND-S', size: 'S', colorName: 'Sand', colorHex: '#C9B18B', stock: 7, barcode: 'BG-100003-SS', qrCode: 'BGQR-100003-SS' },
      { sku: 'BG-LIN-SND-M', size: 'M', colorName: 'Sand', colorHex: '#C9B18B', stock: 9, barcode: 'BG-100003-SM', qrCode: 'BGQR-100003-SM' },
      { sku: 'BG-LIN-OLV-M', size: 'M', colorName: 'Olive', colorHex: '#6E7654', stock: 6, barcode: 'BG-100003-OM', qrCode: 'BGQR-100003-OM' },
    ],
  },
  {
    slug: 'satin-evening-top',
    name: 'Satin Evening Top',
    category: 'women',
    brand: 'bilal-essentials',
    stockMode: 'SIMPLE' as const,
    price: 3590,
    salePrice: null,
    stock: 20,
    description: 'A softly draped satin top designed to pair effortlessly with tailored trousers or denim.',
    tags: ['tops', 'occasionwear'],
    featured: false,
    trending: true,
    barcode: 'BG-100004',
    qrCode: 'BGQR-100004',
    commissionRate: 4,
    images: [
      'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85',
    ],
  },
  {
    slug: 'kids-weekend-set',
    name: 'Kids Weekend Set',
    category: 'kids',
    brand: 'junior-club',
    stockMode: 'VARIANT' as const,
    price: 3290,
    salePrice: 2890,
    description: 'A soft two-piece play set made for comfortable weekends, school breaks, and busy little explorers.',
    tags: ['kids', 'sets', 'new arrival'],
    featured: true,
    trending: false,
    barcode: 'BG-100005',
    qrCode: 'BGQR-100005',
    commissionRate: 2,
    images: [
      'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1519278409-1f56fdfa7fe5?auto=format&fit=crop&w=900&q=85',
    ],
    variants: [
      { sku: 'BG-KID-NVY-4', size: '4-5Y', colorName: 'Navy', colorHex: '#1E2A44', stock: 8, barcode: 'BG-100005-4', qrCode: 'BGQR-100005-4' },
      { sku: 'BG-KID-NVY-6', size: '6-7Y', colorName: 'Navy', colorHex: '#1E2A44', stock: 10, barcode: 'BG-100005-6', qrCode: 'BGQR-100005-6' },
      { sku: 'BG-KID-GRN-6', size: '6-7Y', colorName: 'Forest', colorHex: '#345635', stock: 6, barcode: 'BG-100005-G6', qrCode: 'BGQR-100005-G6' },
    ],
  },
  {
    slug: 'leather-everyday-belt',
    name: 'Leather Everyday Belt',
    category: 'accessories',
    brand: 'bilal-essentials',
    stockMode: 'SIMPLE' as const,
    price: 1990,
    salePrice: null,
    stock: 25,
    description: 'A clean leather-look belt with a brushed buckle, made to finish everyday looks with ease.',
    tags: ['accessories', 'belt'],
    featured: false,
    trending: true,
    barcode: 'BG-100006',
    qrCode: 'BGQR-100006',
    commissionRate: 3,
    images: [
      'https://images.unsplash.com/photo-1624222247344-550fb60583dc?auto=format&fit=crop&w=900&q=85',
      'https://images.unsplash.com/photo-1623998021450-85c8d5d344f1?auto=format&fit=crop&w=900&q=85',
    ],
  },
];

export const seedDemoCatalog = async (): Promise<void> => {
  await bootstrapData();

  for (const brand of demoBrands) {
    await prisma.brand.upsert({ where: { slug: brand.slug }, update: {}, create: brand });
  }

  const categories = await prisma.category.findMany();
  const brands = await prisma.brand.findMany();
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));
  const brandBySlug = new Map(brands.map((brand) => [brand.slug, brand]));

  for (const product of demoProducts) {
    const category = categoryBySlug.get(product.category);
    const brand = brandBySlug.get(product.brand);

    if (!category || !brand) {
      throw new Error(`Demo catalog setup failed for ${product.slug}: category or brand is missing.`);
    }

    const createdProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        categoryId: category.id,
        brandId: brand.id,
        stockMode: product.stockMode,
        price: product.price,
        salePrice: product.salePrice,
        stock: product.stock ?? 0,
        sizesJson: product.variants ? [...new Set(product.variants.map((variant) => variant.size))] : undefined,
        colorsJson: product.variants
          ? [...new Map(product.variants.map((variant) => [variant.colorName, { name: variant.colorName, hex: variant.colorHex }])).values()]
          : undefined,
        tagsJson: product.tags,
        featured: product.featured,
        trending: product.trending,
        barcode: product.barcode,
        qrCode: product.qrCode,
        images: {
          create: product.images.map((path, sortOrder) => ({ path, altText: product.name, sortOrder })),
        },
        variants: product.variants
          ? {
              create: product.variants.map((variant) => ({
                ...variant,
              })),
            }
          : undefined,
      },
      include: { variants: true },
    });

    const existingOpeningStock = await prisma.inventoryMovement.findFirst({
      where: { reference: `DEMO-STOCK-${product.slug}` },
      select: { id: true },
    });

    if (!existingOpeningStock) {
      const stockRows = createdProduct.stockMode === 'VARIANT'
        ? createdProduct.variants.map((variant) => ({ productId: createdProduct.id, variantId: variant.id, delta: variant.stock }))
        : [{ productId: createdProduct.id, variantId: null, delta: createdProduct.stock }];

      await prisma.inventoryMovement.createMany({
        data: stockRows.map((row) => ({
          ...row,
          reason: 'IMPORT',
          note: 'Initial local demo stock',
          source: 'POS',
          reference: `DEMO-STOCK-${product.slug}`,
        })),
      });
    }
  }

  const ali = await prisma.employee.findFirst({ where: { name: 'Ali Raza' }, select: { id: true } });
  if (!ali) {
    await prisma.employee.create({
      data: {
        name: 'Ali Raza',
        phone: '0300-0000001',
        commissionRate: 5,
        notes: 'Demo sales employee for POS commission testing.',
      },
    });
  }
};

const runDemoSeed = async (): Promise<void> => {
  await seedDemoCatalog();
  await prisma.$disconnect();
};

if (/demo\.(?:js|ts)$/.test(process.argv[1] ?? '')) {
  void runDemoSeed();
}
