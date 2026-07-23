import { dashboardRepository } from '../repositories/dashboard.repository';

export type DashboardStats = {
  revenue: number;
  orders: number;
  pendingOrders: number;
  lowStock: number;
  returns: number;
  posRevenue: number;
  posSales: number;
  pendingCommission: number;
  employees: number;
  lowStockItems: Array<{
    productId: string;
    name: string;
    categoryName: string;
    stock: number;
  }>;
  revenueRows: Array<{
    source: 'online' | 'pos';
    number: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: number;
  }>;
  employeeCommissionRows: Array<{
    employeeId: string;
    name: string;
    commissionRate: number;
    pendingCommission: number;
  }>;
};

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const [
      orderAggregate,
      pendingOrders,
      products,
      returns,
      employees,
      posSales,
      posRevenueAggregate,
      pendingCommissionAggregate,
      recentOrders,
      recentPosSales,
      employeesWithPendingCommission,
    ] = await Promise.all([
      dashboardRepository.getOrderAggregate(),
      dashboardRepository.countPendingOrders(),
      dashboardRepository.listProductStockSnapshot(),
      dashboardRepository.countReturns(),
      dashboardRepository.countEmployees(),
      dashboardRepository.countPosSales(),
      dashboardRepository.getPosRevenueAggregate(),
      dashboardRepository.getPendingCommissionAggregate(),
      dashboardRepository.listRecentOrders(),
      dashboardRepository.listRecentPosSales(),
      dashboardRepository.listEmployeesWithPendingCommission(),
    ]);

    const lowStockItems = products
      .map((product) => {
        const totalStock =
          product.stockMode === 'VARIANT'
            ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
            : product.stock;

        return {
          productId: product.id,
          name: product.name,
          categoryName: product.category.name,
          stock: totalStock,
        };
      })
      .filter((product) => product.stock <= 5)
      .sort((left, right) => left.stock - right.stock);

    const revenueRows = [
      ...recentOrders.map((order) => ({
        source: 'online' as const,
        number: order.orderNumber,
        customerName: order.customerName,
        total: Number(order.total),
        status: order.orderStatus.toLowerCase(),
        createdAt: order.createdAt.getTime(),
      })),
      ...recentPosSales.map((sale) => ({
        source: 'pos' as const,
        number: sale.saleNumber,
        customerName: sale.customerName ?? 'Walk-in customer',
        total: Number(sale.total),
        status: sale.status.toLowerCase(),
        createdAt: sale.createdAt.getTime(),
      })),
    ].sort((left, right) => right.createdAt - left.createdAt);

    const employeeCommissionRows = employeesWithPendingCommission.map((employee) => ({
      employeeId: employee.id,
      name: employee.name,
      commissionRate: Number(employee.commissionRate),
      pendingCommission: employee.commissionEntries.reduce((sum, entry) => sum + Number(entry.amount), 0),
    }));

    return {
      revenue: Number(orderAggregate._sum.total ?? 0),
      orders: orderAggregate._count._all,
      pendingOrders,
      lowStock: lowStockItems.length,
      returns,
      posRevenue: Number(posRevenueAggregate._sum.total ?? 0),
      posSales,
      pendingCommission: Number(pendingCommissionAggregate._sum.amount ?? 0),
      employees,
      lowStockItems,
      revenueRows,
      employeeCommissionRows,
    };
  },
};
