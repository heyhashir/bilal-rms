import prisma from '../config/prisma';

export const settingsRepository = {
  getSettings: () => prisma.storeSetting.findFirstOrThrow(),
  getShippingZones: () =>
    prisma.shippingZone.findMany({
      orderBy: { city: 'asc' },
    }),
  updateSettings: (
    id: string,
    data: {
      storeName: string;
      logoPrimaryText: string;
      logoSecondaryText: string;
      logoTertiaryText: string;
      promoRibbonText: string;
      tagline: string;
      description: string;
      email: string;
      phone: string;
      address: string;
      currencySymbol: string;
      invoicePrefix: string;
      receiptPrefix: string;
      thermalHeader: string;
      thermalFooter: string;
      barcodePrefix: string;
      qrPrefix: string;
      instagram?: string | null;
      facebook?: string | null;
      tiktok?: string | null;
      metaTitle: string;
      metaDescription: string;
    },
  ) =>
    prisma.storeSetting.update({
      where: { id },
      data,
    }),
  upsertShippingZone: (input: {
    name: string;
    city: string;
    fee: number;
    freeAbove?: number | null;
    isActive: boolean;
  }) =>
    prisma.shippingZone.upsert({
      where: { city: input.city },
      update: {
        name: input.name,
        fee: input.fee,
        freeAbove: input.freeAbove ?? null,
        isActive: input.isActive,
      },
      create: {
        name: input.name,
        city: input.city,
        fee: input.fee,
        freeAbove: input.freeAbove ?? null,
        isActive: input.isActive,
      },
    }),
  deleteShippingZone: (id: string) =>
    prisma.shippingZone.delete({
      where: { id },
    }),
};
