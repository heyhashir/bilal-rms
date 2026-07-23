import { reportRepository } from '../repositories/report.repository';

const toRange = (from?: string, to?: string) => {
  const parsedFrom = from ? new Date(from) : undefined;
  const parsedTo = to ? new Date(to) : undefined;

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from) && parsedFrom && !Number.isNaN(parsedFrom.getTime())) {
    parsedFrom.setHours(0, 0, 0, 0);
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to) && parsedTo && !Number.isNaN(parsedTo.getTime())) {
    parsedTo.setHours(23, 59, 59, 999);
  }

  return {
    from: parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : undefined,
    to: parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : undefined,
  };
};

export const reportService = {
  async getSummary(input: { from?: string; to?: string }) {
    const range = toRange(input.from, input.to);
    const [orders, posSales, commissions, ledgerEntries] = await Promise.all([
      reportRepository.listOrders(range),
      reportRepository.listPosSales(range),
      reportRepository.listCommissionEntries(range),
      reportRepository.listLedgerEntries(range),
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

    const profitByProduct = new Map<string, { productId: string; productName: string; categoryName: string; profit: number }>();
    const profitByCategory = new Map<string, { categorySlug: string; categoryName: string; profit: number }>();
    let totalProfit = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const unitPrice = Number(item.unitPrice);
        const unitCost = Number(item.variant?.costPrice ?? item.product.costPrice ?? 0);
        const profit = (unitPrice - unitCost) * item.qty;
        totalProfit += profit;

        const productRow = profitByProduct.get(item.productId) ?? {
          productId: item.productId,
          productName: item.name,
          categoryName: item.product.category.name,
          profit: 0,
        };
        productRow.profit += profit;
        profitByProduct.set(item.productId, productRow);

        const categoryRow = profitByCategory.get(item.product.category.slug) ?? {
          categorySlug: item.product.category.slug,
          categoryName: item.product.category.name,
          profit: 0,
        };
        categoryRow.profit += profit;
        profitByCategory.set(item.product.category.slug, categoryRow);
      }
    }

    for (const sale of posSales) {
      for (const item of sale.items) {
        const unitPrice = Number(item.unitPrice);
        const unitCost = Number(item.variant?.costPrice ?? item.product.costPrice ?? 0);
        const saleProfit = (unitPrice - unitCost) * item.qty;
        const refundCost = (unitPrice - unitCost) * item.refundedQty;
        const profit = saleProfit - refundCost;
        totalProfit += profit;

        const productRow = profitByProduct.get(item.productId) ?? {
          productId: item.productId,
          productName: item.name,
          categoryName: item.product.category.name,
          profit: 0,
        };
        productRow.profit += profit;
        profitByProduct.set(item.productId, productRow);

        const categoryRow = profitByCategory.get(item.product.category.slug) ?? {
          categorySlug: item.product.category.slug,
          categoryName: item.product.category.name,
          profit: 0,
        };
        categoryRow.profit += profit;
        profitByCategory.set(item.product.category.slug, categoryRow);
      }
    }

    const ledgerTotals = ledgerEntries.reduce(
      (totals, entry) => {
        const amount = Number(entry.amount);
        if (entry.direction === 'CREDIT') {
          totals.credit += amount;
        } else {
          totals.debit += amount;
        }
        return totals;
      },
      { credit: 0, debit: 0 },
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
      profit: {
        total: totalProfit,
        byCategory: Array.from(profitByCategory.values()).sort((left, right) => right.profit - left.profit),
        byProduct: Array.from(profitByProduct.values()).sort((left, right) => right.profit - left.profit),
      },
      ledger: {
        credit: ledgerTotals.credit,
        debit: ledgerTotals.debit,
        net: ledgerTotals.credit - ledgerTotals.debit,
        count: ledgerEntries.length,
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
