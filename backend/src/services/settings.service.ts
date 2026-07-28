import { settingsRepository } from '../repositories/settings.repository';

export const settingsService = {
  async getSettingsSnapshot() {
    const [settings, shippingZones] = await Promise.all([
      settingsRepository.getSettings(),
      settingsRepository.getShippingZones(),
    ]);

    return { settings, shippingZones: sortShippingZones(shippingZones) };
  },
  async updateSettings(input: {
    name: string;
    logoPrimaryText: string;
    logoSecondaryText: string;
    logoTertiaryText: string;
    promoRibbonText: string;
    tagline: string;
    description: string;
    email: string;
    phone: string;
    address: string;
    taxNumber?: string;
    receiptLogoPath?: string;
    currencySymbol: string;
    invoicePrefix: string;
    receiptPrefix: string;
    thermalHeader?: string;
    thermalFooter?: string;
    receiptThankYou?: string;
    guaranteePolicy?: string;
    exchangePolicy?: string;
    returnPolicy?: string;
    saleItemPolicy?: string;
    receiptNotes?: string;
    barcodePrefix: string;
    qrPrefix: string;
    barcodeLabelTemplate: 'branded' | 'compact';
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    metaTitle: string;
    metaDescription: string;
  }) {
    const existing = await settingsRepository.getSettings();
    return settingsRepository.updateSettings(existing.id, {
        storeName: input.name,
        logoPrimaryText: input.logoPrimaryText,
        logoSecondaryText: input.logoSecondaryText,
        logoTertiaryText: input.logoTertiaryText,
        promoRibbonText: input.promoRibbonText,
        tagline: input.tagline,
        description: input.description,
        email: input.email,
        phone: input.phone,
        address: input.address,
        taxNumber: input.taxNumber || null,
        receiptLogoPath: input.receiptLogoPath || null,
        currencySymbol: input.currencySymbol,
        invoicePrefix: input.invoicePrefix,
        receiptPrefix: input.receiptPrefix,
        thermalHeader: input.thermalHeader || '',
        thermalFooter: input.thermalFooter || '',
        receiptThankYou: input.receiptThankYou ?? existing.receiptThankYou,
        guaranteePolicy: input.guaranteePolicy ?? existing.guaranteePolicy,
        exchangePolicy: input.exchangePolicy ?? existing.exchangePolicy,
        returnPolicy: input.returnPolicy ?? existing.returnPolicy,
        saleItemPolicy: input.saleItemPolicy ?? existing.saleItemPolicy,
        receiptNotes: input.receiptNotes ?? existing.receiptNotes,
        barcodePrefix: input.barcodePrefix,
        qrPrefix: input.qrPrefix,
        barcodeLabelTemplate: input.barcodeLabelTemplate,
        instagram: input.instagram || null,
        facebook: input.facebook || null,
        tiktok: input.tiktok || null,
        metaTitle: input.metaTitle,
        metaDescription: input.metaDescription,
    });
  },
  saveShippingZone(input: {
    name: string;
    city: string;
    fee: number;
    freeAbove?: number | null;
    isActive: boolean;
  }) {
    return settingsRepository.upsertShippingZone(input);
  },
  deleteShippingZone: (id: string) => settingsRepository.deleteShippingZone(id),
};

const sortShippingZones = <T extends { city: string }>(zones: T[]) =>
  [...zones].sort((left, right) => {
    if (left.city === 'ALL_CITIES' && right.city !== 'ALL_CITIES') {
      return 1;
    }

    if (right.city === 'ALL_CITIES' && left.city !== 'ALL_CITIES') {
      return -1;
    }

    return left.city.localeCompare(right.city);
  });
