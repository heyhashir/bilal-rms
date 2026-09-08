import prisma from '../config/prisma';

export const settingsRepository = {
  getSettings: async () => {
    try {
      return await prisma.storeSetting.findFirstOrThrow();
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2022') {
        const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM store_settings LIMIT 1`;
        if (rows.length > 0) {
          const row = rows[0];
          return {
            ...row,
            whatsapp: (row.whatsapp as string) ?? null,
            youtube: (row.youtube as string) ?? null,
            instagram: (row.instagram as string) ?? null,
            facebook: (row.facebook as string) ?? null,
            tiktok: (row.tiktok as string) ?? null,
          } as unknown as Awaited<ReturnType<typeof prisma.storeSetting.findFirstOrThrow>>;
        }
      }
      throw err;
    }
  },
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
      taxNumber?: string | null;
      receiptLogoPath?: string | null;
      currencySymbol: string;
      invoicePrefix: string;
      receiptPrefix: string;
      thermalHeader: string;
      thermalFooter: string;
      receiptThankYou: string;
      guaranteePolicy: string;
      exchangePolicy: string;
      returnPolicy: string;
      saleItemPolicy: string;
      receiptNotes: string;
      barcodePrefix: string;
      qrPrefix: string;
      barcodeLabelTemplate: string;
      whatsapp?: string | null;
      instagram?: string | null;
      facebook?: string | null;
      tiktok?: string | null;
      youtube?: string | null;
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
