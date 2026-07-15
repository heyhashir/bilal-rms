import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { serializeSettings, serializeShippingZone } from '../../utils/serializers';
import { settingsService } from '../../services/settings.service';
import { logAdminAudit } from '../../utils/adminAudit';

export const getSettings = async (_req: Request, res: Response) => {
  const { settings, shippingZones } = await settingsService.getSettingsSnapshot();
  res.status(200).json(
    ApiResponse.success('Settings loaded', {
      settings: serializeSettings(settings),
      shippingZones: shippingZones.map(serializeShippingZone),
    }),
  );
};

export const updateSettings = async (req: Request, res: Response) => {
  const settings = await settingsService.updateSettings(req.body);
  logAdminAudit(req, {
    action: 'settings.updated',
    targetType: 'store-settings',
    targetId: settings.id,
    details: {
      name: settings.storeName,
      email: settings.email,
      invoicePrefix: settings.invoicePrefix,
      receiptPrefix: settings.receiptPrefix,
    },
  });
  res.status(200).json(ApiResponse.success('Settings updated', { settings: serializeSettings(settings) }));
};

export const saveShippingZone = async (req: Request, res: Response) => {
  const zone = await settingsService.saveShippingZone(req.body);
  logAdminAudit(req, {
    action: 'shipping-zone.saved',
    targetType: 'shipping-zone',
    targetId: zone.id,
    details: {
      city: zone.city,
      fee: Number(zone.fee),
      isActive: zone.isActive,
    },
  });
  res.status(201).json(ApiResponse.success('Shipping zone saved', { zone: serializeShippingZone(zone) }));
};

export const deleteShippingZone = async (req: Request, res: Response) => {
  await settingsService.deleteShippingZone(req.params.id);
  logAdminAudit(req, {
    action: 'shipping-zone.deleted',
    targetType: 'shipping-zone',
    targetId: req.params.id,
  });
  res.status(200).json(ApiResponse.success('Shipping zone deleted', { ok: true }));
};
