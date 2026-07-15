import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import {
  serializeBrand,
  serializeCategory,
  serializeCommissionEntry,
  serializeEmployee,
  serializeAdminCustomer,
  serializeOrder,
  serializePosSale,
  serializeProduct,
  serializeReturnRequest,
  serializeSettings,
  serializeShippingZone,
} from '../../utils/serializers';
import { adminBootstrapService } from '../../services/admin-bootstrap.service';

export const getBootstrap = async (_req: Request, res: Response) => {
  const payload = await adminBootstrapService.getBootstrapPayload();

  res.status(200).json(
    ApiResponse.success('Admin data loaded', {
      dashboard: payload.dashboard,
      settings: serializeSettings(payload.settings),
      categories: payload.categories.map(serializeCategory),
      brands: payload.brands.map(serializeBrand),
      products: payload.products.map(serializeProduct),
      orders: payload.orders.map(serializeOrder),
      customers: payload.customers.map(serializeAdminCustomer),
      returns: payload.returns.map(serializeReturnRequest),
      shippingZones: payload.shippingZones.map(serializeShippingZone),
      employees: payload.employees.map(serializeEmployee),
      posSales: payload.posSales.map(serializePosSale),
      commissions: payload.commissions.map(serializeCommissionEntry),
    }),
  );
};
