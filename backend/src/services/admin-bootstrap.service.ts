import { catalogAdminService } from './catalog-admin.service';
import { commissionService } from './commission.service';
import { customerAdminService } from './customer-admin.service';
import { dashboardService } from './dashboard.service';
import { employeeService } from './employee.service';
import { orderService } from './order.service';
import { posService } from './pos.service';
import { settingsService } from './settings.service';

export const adminBootstrapService = {
  async getBootstrapPayload() {
    const [
      dashboard,
      settingsSnapshot,
      products,
      categories,
      brands,
      orders,
      customers,
      returns,
      employees,
      posSales,
      commissions,
    ] = await Promise.all([
      dashboardService.getStats(),
      settingsService.getSettingsSnapshot(),
      catalogAdminService.listProducts(),
      catalogAdminService.listCategories(),
      catalogAdminService.listBrands(),
      orderService.listAdminOrders(),
      customerAdminService.listCustomers(),
      orderService.listAdminReturns(),
      employeeService.listEmployees(),
      posService.listSales(),
      commissionService.listCommissions(),
    ]);

    return {
      dashboard,
      settings: settingsSnapshot.settings,
      shippingZones: settingsSnapshot.shippingZones,
      products,
      categories,
      brands,
      orders: orders.items,
      customers: customers.items,
      returns,
      employees,
      posSales: posSales.items,
      commissions: commissions.items,
    };
  },
};
