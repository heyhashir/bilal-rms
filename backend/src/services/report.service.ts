import { reportRepository } from '../repositories/report.repository';

const toRange = (from?: string, to?: string) => {
  const parsedFrom = from ? new Date(from) : undefined;
  const parsedTo = to ? new Date(to) : undefined;

  return {
    from: parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : undefined,
    to: parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : undefined,
  };
};

export const reportService = {
  async getSummary(input: { from?: string; to?: string }) {
    const range = toRange(input.from, input.to);
    const [orders, posSales, commissions] = await Promise.all([
      reportRepository.listOrders(range),
      reportRepository.listPosSales(range),
      reportRepository.listCommissionEntries(range),
    ]);

    const employeeSummary = new Map<
      string,
      { employeeId: string; employeeName: string; earned: number; reversed: number; paid: number; payable: number }
    >();
    const productSummary = new Map<
      string,
      { productName: string; earned: number; reversed: number; paid: number; payable: number }
    >();

    let earned = 0;
    let reversed = 0;
    let paid = 0;

    for (const entry of commissions) {
      const amount = Number(entry.amount);
      const employeeRow =
        employeeSummary.get(entry.employeeId) ??
        {
          employeeId: entry.employeeId,
          employeeName: entry.employee.name,
          earned: 0,
          reversed: 0,
          paid: 0,
          payable: 0,
        };
      const productKey = entry.saleItem.productId;
      const productRow =
        productSummary.get(productKey) ??
        {
          productName: entry.saleItem.name,
          earned: 0,
          reversed: 0,
          paid: 0,
          payable: 0,
        };

      if (entry.status === 'PAID') {
        paid += amount;
        employeeRow.paid += amount;
        productRow.paid += amount;
      } else if (entry.status === 'REVERSED') {
        reversed += amount;
        employeeRow.reversed += amount;
        productRow.reversed += amount;
      } else {
        earned += amount;
        employeeRow.earned += amount;
        productRow.earned += amount;
      }

      employeeRow.payable = employeeRow.earned + employeeRow.reversed - employeeRow.paid;
      productRow.payable = productRow.earned + productRow.reversed - productRow.paid;
      employeeSummary.set(entry.employeeId, employeeRow);
      productSummary.set(productKey, productRow);
    }

    const posRefundAmount = posSales.reduce(
      (sum, sale) => sum + sale.returns.reduce((total, entry) => total + Number(entry.amount), 0),
      0,
    );

    return {
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      overview: {
        onlineOrders: orders.length,
        onlineRevenue: orders.reduce((sum, order) => sum + Number(order.total), 0),
        posSales: posSales.length,
        posRevenue: posSales.reduce((sum, sale) => sum + Number(sale.total), 0),
        posRefundAmount,
      },
      commissions: {
        earned,
        reversed,
        paid,
        payable: earned + reversed - paid,
      },
      employees: Array.from(employeeSummary.values()).sort((left, right) => right.payable - left.payable),
      products: Array.from(productSummary.entries())
        .map(([productId, row]) => ({ productId, ...row }))
        .sort((left, right) => right.payable - left.payable),
    };
  },
};
