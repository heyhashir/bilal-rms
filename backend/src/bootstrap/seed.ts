import bcrypt from 'bcrypt';
import prisma from '../config/prisma';
import { env } from '../config/env';
import { ensureRuntimeDirectories } from '../utils/files';

const defaultCategories = [
  { slug: 'men', name: 'Men' },
  { slug: 'women', name: 'Women' },
  { slug: 'kids', name: 'Kids' },
  { slug: 'accessories', name: 'Accessories' },
];

const defaultShippingZones = [
  { name: 'Attock', city: 'Attock', fee: 250, freeAbove: 6000 },
  { name: 'Karachi', city: 'Karachi', fee: 300, freeAbove: 7000 },
  { name: 'Islamabad', city: 'Islamabad', fee: 250, freeAbove: 6000 },
  { name: 'Rawalpindi', city: 'Rawalpindi', fee: 250, freeAbove: 6000 },
  { name: 'Faisalabad', city: 'Faisalabad', fee: 250, freeAbove: 6000 },
  { name: 'All cities', city: 'ALL_CITIES', fee: 300, freeAbove: 7000 },
];

export const bootstrapData = async (): Promise<void> => {
  ensureRuntimeDirectories();

  const existingSettings = await prisma.storeSetting.findFirst();
  if (!existingSettings) {
    await prisma.storeSetting.create({
      data: {
        storeName: 'BALI by Bilal Garments EST 2001.',
        logoPrimaryText: 'BALI',
        logoSecondaryText: 'By Bilal Garments',
        logoTertiaryText: 'EST 2001',
        promoRibbonText:
          'Free shipping over Rs. 6,000\nNew drop\nAW26 collection live now\nCOD available across Pakistan\nEasy 7-day returns',
        tagline: 'Crafted since 2001. Worn every day.',
        description: 'Contemporary ready-to-wear, in-store retail, and tailored essentials for Men, Women, Kids, and Accessories.',
        email: 'hello@balibybilalgarments.pk',
        phone: '+92 300 0000000',
        address: 'Attock, Punjab, Pakistan',
        currencyCode: 'PKR',
        currencySymbol: 'Rs.',
        invoicePrefix: 'BALI',
        receiptPrefix: 'BALI',
        thermalHeader: 'BALI by Bilal Garments EST 2001.\nAttock, Punjab, Pakistan',
        thermalFooter: 'Thank you for shopping with us.',
        barcodePrefix: 'BALI',
        qrPrefix: 'BALIQ',
        metaTitle: 'BALI by Bilal Garments EST 2001. - Contemporary fashion and retail',
        metaDescription: 'Shop contemporary clothing, in-store billing, and curated essentials from BALI by Bilal Garments EST 2001.',
        instagram: 'https://instagram.com',
        facebook: 'https://facebook.com',
        tiktok: 'https://tiktok.com',
      },
    });
  } else {
    const maybePatchedSettings = {
      storeName:
        existingSettings.storeName === 'Bilal Garments'
          ? 'BALI by Bilal Garments EST 2001.'
          : existingSettings.storeName,
      logoPrimaryText: existingSettings.logoPrimaryText || 'BALI',
      logoSecondaryText: existingSettings.logoSecondaryText || 'By Bilal Garments',
      logoTertiaryText: existingSettings.logoTertiaryText || 'EST 2001',
      promoRibbonText:
        existingSettings.promoRibbonText ||
        'Free shipping over Rs. 6,000\nNew drop\nAW26 collection live now\nCOD available across Pakistan\nEasy 7-day returns',
      tagline:
        existingSettings.tagline === 'Wear bold. Live louder.'
          ? 'Crafted since 2001. Worn every day.'
          : existingSettings.tagline,
      description:
        existingSettings.description === 'Premium contemporary clothing for Men, Women, Kids, and Accessories.'
          ? 'Contemporary ready-to-wear, in-store retail, and tailored essentials for Men, Women, Kids, and Accessories.'
          : existingSettings.description,
      email:
        existingSettings.email === 'hello@bilalgarments.pk'
          ? 'hello@balibybilalgarments.pk'
          : existingSettings.email,
      address:
        existingSettings.address === 'Lahore, Pakistan'
          ? 'Attock, Punjab, Pakistan'
          : existingSettings.address,
      thermalHeader:
        existingSettings.thermalHeader === 'Bilal Garments\nLahore, Pakistan'
          ? 'BALI by Bilal Garments EST 2001.\nAttock, Punjab, Pakistan'
          : existingSettings.thermalHeader,
      invoicePrefix: existingSettings.invoicePrefix === 'BG' ? 'BALI' : existingSettings.invoicePrefix,
      receiptPrefix: existingSettings.receiptPrefix === 'REC' ? 'BALI' : existingSettings.receiptPrefix,
      barcodePrefix: existingSettings.barcodePrefix === 'BG' ? 'BALI' : existingSettings.barcodePrefix,
      qrPrefix: existingSettings.qrPrefix === 'BGQR' ? 'BALIQ' : existingSettings.qrPrefix,
      metaTitle:
        existingSettings.metaTitle === 'Bilal Garments - Wear bold. Live louder.'
          ? 'BALI by Bilal Garments EST 2001. - Contemporary fashion and retail'
          : existingSettings.metaTitle,
      metaDescription:
        existingSettings.metaDescription === 'Premium contemporary clothing for Men, Women, Kids, and Accessories.'
          ? 'Shop contemporary clothing, in-store billing, and curated essentials from BALI by Bilal Garments EST 2001.'
          : existingSettings.metaDescription,
    };

    await prisma.storeSetting.update({
      where: { id: existingSettings.id },
      data: maybePatchedSettings,
    });
  }

  const categoryCount = await prisma.category.count();
  if (categoryCount === 0) {
    await prisma.category.createMany({
      data: defaultCategories,
    });
  }

  for (const zone of defaultShippingZones) {
    await prisma.shippingZone.upsert({
      where: { city: zone.city },
      update: zone,
      create: zone,
    });
  }

  const admin = await prisma.user.findUnique({
    where: { email: env.ADMIN_EMAIL },
  });

  if (!admin) {
    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);
    await prisma.user.create({
      data: {
        email: env.ADMIN_EMAIL,
        name: 'Bilal Admin',
        passwordHash,
        role: 'ADMIN',
      },
    });
  }

  const device = await prisma.registerDevice.findUnique({
    where: { deviceKey: 'hostinger-web' },
  });

  if (!device) {
    await prisma.registerDevice.create({
      data: {
        name: 'Hostinger Web',
        deviceKey: 'hostinger-web',
        syncStatus: 'SYNCED',
        lastSeenAt: new Date(),
        lastSyncAt: new Date(),
        notes: 'Default cloud runtime device.',
      },
    });
  }
};

const runSeed = async (): Promise<void> => {
  await bootstrapData();
  await prisma.$disconnect();
};

if (/seed\.(?:js|ts)$/.test(process.argv[1] ?? '')) {
  void runSeed();
}
