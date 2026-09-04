import { reportRepository } from '../repositories/report.repository';

const toRange = (from?: string, to?: string) => {
  let parsedFrom: Date | undefined;
  let parsedTo: Date | undefined;

  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) {
    const [y, m, d] = from.split('-').map(Number);
    parsedFrom = new Date(y, m - 1, d, 0, 0, 0, 0);
  } else if (from) {
    parsedFrom = new Date(from);
  }

  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    const [y, m, d] = to.split('-').map(Number);
    parsedTo = new Date(y, m - 1, d, 23, 59, 59, 999);
  } else if (to) {
    parsedTo = new Date(to);
  }

  return {
    from: parsedFrom && !Number.isNaN(parsedFrom.getTime()) ? parsedFrom : undefined,
    to: parsedTo && !Number.isNaN(parsedTo.getTime()) ? parsedTo : undefined,
  };
};

export const reportService = {
  async getSummary(input: { from?: string; to?: string }) {
    const range = toRange(input.from, input.to);
    const [orders, operationalOnlineOrders, posSales, commissions, ledgerEntries, vendorPurchases] = await Promise.all([
      reportRepository.listDeliveredOrders(range),
      reportRepository.countOperationalOrders(range),
      reportRepository.listPosSales(range),
      reportRepository.listCommissionEntries(range),
      reportRepository.listLedgerEntries(range),
      reportRepository.listVendorPurchases(range),
    ]);

    const employeeSummary = new Map<
      string,
      { employeeId: string; employeeName: string; earned: number; cancelled: number; paid: number; payable: number }
    >();
    const productSummary = new Map<
      string,
      { productName: string; earned: number; cancelled: number; paid: number; payable: number }
    >();

    let earned = 0;
    let cancelled = 0;
    let paid = 0;

    for (const entry of commissions) {
      const amount = Number(entry.amount);
      const employeeRow =
        employeeSummary.get(entry.employeeId) ??
        {
          employeeId: entry.employeeId,
          employeeName: entry.employee.name,
          earned: 0,
          cancelled: 0,
          paid: 0,
          payable: 0,
        };
      const productKey = entry.saleItem.productId;
      const productRow =
        productSummary.get(productKey) ??
        {
          productName: entry.saleItem.name,
          earned: 0,
          cancelled: 0,
          paid: 0,
          payable: 0,
        };

      const cancelledAmount = Number(entry.cancelledAmount);
      const payableAmount = Math.max(0, amount - cancelledAmount);
      if (entry.status === 'PAID') {
        paid += payableAmount;
        employeeRow.paid += payableAmount;
        productRow.paid += payableAmount;
      } else {
        earned += payableAmount;
        cancelled += cancelledAmount;
        employeeRow.earned += payableAmount;
        employeeRow.cancelled += cancelledAmount;
        productRow.earned += payableAmount;
        productRow.cancelled += cancelledAmount;
      }

      employeeRow.payable = employeeRow.earned;
      productRow.payable = productRow.earned;
      employeeSummary.set(entry.employeeId, employeeRow);
      productSummary.set(productKey, productRow);
    }

    const posRefundAmount = posSales.reduce(
      (sum, sale) => sum + sale.returns.reduce((total, entry) => total + Number(entry.amount), 0),
      0,
    );

    const profitByProduct = new Map<string, { productId: string; productName: string; categoryName: string; profit: number }>();
    const profitByCategory = new Map<string, { categorySlug: string; categoryName: string; profit: number }>();
    const itemMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        categoryName: string;
        barcode: string;
        unitsSold: number;
        unitsRefunded: number;
        grossRevenue: number;
        netRevenue: number;
        totalCost: number;
        netProfit: number;
      }
    >();

    let totalProfit = 0;

    for (const order of orders) {
      totalProfit += Number(order.shippingFee);
      for (const item of order.items) {
        const unitPrice = Number(item.unitPrice);
        const unitCost = Number(item.unitCost ?? item.variant?.costPrice ?? item.product.costPrice ?? 0);
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

        const itemRow = itemMap.get(item.productId) ?? {
          productId: item.productId,
          productName: item.name,
          categoryName: item.product.category.name,
          barcode: item.product.barcode || '',
          unitsSold: 0,
          unitsRefunded: 0,
          grossRevenue: 0,
          netRevenue: 0,
          totalCost: 0,
          netProfit: 0,
        };
        itemRow.unitsSold += item.qty;
        itemRow.grossRevenue += unitPrice * item.qty;
        itemRow.netRevenue += unitPrice * item.qty;
        itemRow.totalCost += unitCost * item.qty;
        itemRow.netProfit += profit;
        itemMap.set(item.productId, itemRow);
      }
    }

    for (const sale of posSales) {
      for (const item of sale.items) {
        const unitPrice = Number(item.unitPrice);
        const unitCost = Number(item.unitCost ?? item.variant?.costPrice ?? item.product.costPrice ?? 0);
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

        const itemRow = itemMap.get(item.productId) ?? {
          productId: item.productId,
          productName: item.name,
          categoryName: item.product.category.name,
          barcode: item.product.barcode || '',
          unitsSold: 0,
          unitsRefunded: 0,
          grossRevenue: 0,
          netRevenue: 0,
          totalCost: 0,
          netProfit: 0,
        };
        itemRow.unitsSold += item.qty;
        itemRow.unitsRefunded += item.refundedQty;
        itemRow.grossRevenue += unitPrice * item.qty;
        itemRow.netRevenue += unitPrice * (item.qty - item.refundedQty);
        itemRow.totalCost += unitCost * (item.qty - item.refundedQty);
        itemRow.netProfit += profit;
        itemMap.set(item.productId, itemRow);
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

    const wholesaleSpend = vendorPurchases.reduce((sum, p) => sum + p.quantity * Number(p.unitCost), 0);
    const wholesaleUnits = vendorPurchases.reduce((sum, p) => sum + p.quantity, 0);

    return {
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      overview: {
        onlineOrders: orders.length,
        operationalOnlineOrders,
        onlineRevenue: orders.reduce((sum, order) => sum + Number(order.total), 0),
        posSales: posSales.length,
        posRevenue: posSales.reduce(
          (sum, sale) => sum + Number(sale.total) - sale.returns.reduce((returnSum, entry) => returnSum + Number(entry.amount), 0),
          0,
        ),
        posRefundAmount,
      },
      wholesale: {
        count: vendorPurchases.length,
        totalSpend: wholesaleSpend,
        totalUnits: wholesaleUnits,
      },
      profit: {
        total: totalProfit,
        byCategory: Array.from(profitByCategory.values()).sort((left, right) => right.profit - left.profit),
        byProduct: Array.from(profitByProduct.values()).sort((left, right) => right.profit - left.profit),
      },
      itemWiseSales: Array.from(itemMap.values()).sort((a, b) => b.netRevenue - a.netRevenue),
      ledger: {
        credit: ledgerTotals.credit,
        debit: ledgerTotals.debit,
        net: ledgerTotals.credit - ledgerTotals.debit,
        count: ledgerEntries.length,
      },
      commissions: {
        earned,
        reversed: 0,
        cancelled,
        paid,
        payable: earned,
      },
      employees: Array.from(employeeSummary.values()).sort((left, right) => right.payable - left.payable),
      products: Array.from(productSummary.entries())
        .map(([productId, row]) => ({ productId, ...row }))
        .sort((left, right) => right.payable - left.payable),
    };
  },

  async getBillWiseReport(input: {
    from?: string;
    to?: string;
    cashier?: string;
    paymentMethod?: string;
    type?: string;
    query?: string;
  }) {
    const range = toRange(input.from, input.to);
    const posSales = await reportRepository.listPosSalesForBillWise(range);

    type BillRow = {
      id: string;
      saleId: string;
      date: string;
      time: string;
      timestamp: number;
      receiptNumber: string;
      receiptType: 'Sales' | 'Refund';
      cashier: string;
      salespeople: string[];
      paymentMethod: string;
      qtySold: number;
      total: number;
      customerName: string;
      customerPhone: string;
      items: Array<{
        name: string;
        sku: string;
        size: string;
        colorName: string;
        qty: number;
        unitPrice: number;
        lineTotal: number;
        refundedQty: number;
      }>;
    };

    const rows: BillRow[] = [];

    for (const sale of posSales) {
      const cashierName = sale.cashier?.name || sale.deviceName || 'Admin';
      const salespeople = Array.from(new Set(sale.items.flatMap((item) => (item.employee?.name ? [item.employee.name] : []))));

      const paymentMethod = (sale.paymentMethod || sale.payments[0]?.method || 'CASH').toUpperCase();
      const saleDate = sale.createdAt.toISOString().slice(0, 10);
      const saleTime = sale.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const qtySold = sale.items.reduce((s, i) => s + i.qty, 0);
      const total = Number(sale.total);

      rows.push({
        id: `sale_${sale.id}`,
        saleId: sale.id,
        date: saleDate,
        time: saleTime,
        timestamp: sale.createdAt.getTime(),
        receiptNumber: sale.saleNumber,
        receiptType: 'Sales',
        cashier: cashierName,
        salespeople,
        paymentMethod,
        qtySold,
        total,
        customerName: sale.customerName || '',
        customerPhone: sale.customerPhone || '',
        items: sale.items.map((i) => ({
          name: i.name,
          sku: i.sku || '',
          size: i.size || '',
          colorName: i.colorName || '',
          qty: i.qty,
          unitPrice: Number(i.unitPrice),
          lineTotal: Number(i.lineTotal),
          refundedQty: i.refundedQty,
        })),
      });

      if (sale.returns && sale.returns.length > 0) {
        for (const ret of sale.returns) {
          const retDate = ret.createdAt.toISOString().slice(0, 10);
          const retTime = ret.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          const retQty = ret.qty || 1;
          const retAmount = Number(ret.amount);

          rows.push({
            id: `ret_${ret.id}`,
            saleId: sale.id,
            date: retDate,
            time: retTime,
            timestamp: ret.createdAt.getTime(),
            receiptNumber: `${sale.saleNumber}-RET-${ret.id.slice(-6).toUpperCase()}`,
            receiptType: 'Refund',
            cashier: cashierName,
            salespeople,
            paymentMethod,
            qtySold: -retQty,
            total: -retAmount,
            customerName: sale.customerName || '',
            customerPhone: sale.customerPhone || '',
            items: ret.saleItem
              ? [
                  {
                    name: ret.saleItem.name,
                    sku: ret.saleItem.sku || '',
                    size: ret.saleItem.size || '',
                    colorName: ret.saleItem.colorName || '',
                    qty: ret.qty,
                    unitPrice: Number(ret.saleItem.unitPrice),
                    lineTotal: -retAmount,
                    refundedQty: ret.qty,
                  },
                ]
              : [
                  {
                    name: `Refund: ${ret.reason || 'Returned item'}`,
                    sku: '',
                    size: '',
                    colorName: '',
                    qty: ret.qty,
                    unitPrice: 0,
                    lineTotal: -retAmount,
                    refundedQty: ret.qty,
                  },
                ],
          });
        }
      }
    }

    rows.sort((a, b) => b.timestamp - a.timestamp);

    const filtered = rows.filter((r) => {
      if (input.cashier && input.cashier !== 'ALL') {
        if (input.cashier.toLowerCase() === 'admin' && r.cashier.toLowerCase() !== 'admin') return false;
        if (input.cashier.toLowerCase() !== 'admin' && !r.cashier.toLowerCase().includes(input.cashier.toLowerCase())) return false;
      }
      if (input.paymentMethod && input.paymentMethod !== 'ALL') {
        if (r.paymentMethod.toUpperCase() !== input.paymentMethod.toUpperCase()) return false;
      }
      if (input.type && input.type !== 'ALL') {
        if (input.type.toLowerCase() === 'sale' && r.receiptType !== 'Sales') return false;
        if (input.type.toLowerCase() === 'refund' && r.receiptType !== 'Refund') return false;
      }
      if (input.query) {
        const q = input.query.toLowerCase();
        const matches =
          r.receiptNumber.toLowerCase().includes(q) ||
          r.cashier.toLowerCase().includes(q) ||
          r.salespeople.some((name) => name.toLowerCase().includes(q)) ||
          r.customerName.toLowerCase().includes(q) ||
          r.customerPhone.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    let totalSalesCount = 0;
    let totalRefundsCount = 0;
    let totalQtySold = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalDigital = 0;
    let totalRefundAmount = 0;
    let totalSalesAmount = 0;

    for (const r of filtered) {
      totalQtySold += r.qtySold;
      if (r.receiptType === 'Sales') {
        totalSalesCount += 1;
        totalSalesAmount += r.total;
        if (r.paymentMethod === 'CASH') totalCash += r.total;
        else if (r.paymentMethod === 'CARD') totalCard += r.total;
        else totalDigital += r.total;
      } else {
        totalRefundsCount += 1;
        totalRefundAmount += Math.abs(r.total);
        if (r.paymentMethod === 'CASH') totalCash -= Math.abs(r.total);
        else if (r.paymentMethod === 'CARD') totalCard -= Math.abs(r.total);
        else totalDigital -= Math.abs(r.total);
      }
    }

    const grandNetTotal = Math.round((totalSalesAmount - totalRefundAmount) * 100) / 100;

    return {
      range: {
        from: range.from?.toISOString() ?? null,
        to: range.to?.toISOString() ?? null,
      },
      summary: {
        totalBills: filtered.length,
        totalSalesCount,
        totalRefundsCount,
        totalQtySold,
        totalSalesAmount: Math.round(totalSalesAmount * 100) / 100,
        totalRefundAmount: Math.round(totalRefundAmount * 100) / 100,
        netCash: Math.round(totalCash * 100) / 100,
        netCard: Math.round(totalCard * 100) / 100,
        netDigital: Math.round(totalDigital * 100) / 100,
        grandNetTotal,
      },
      bills: filtered,
    };
  },

  async getBillWiseReportForExport(input: {
    from?: string;
    to?: string;
    cashier?: string;
    paymentMethod?: string;
    type?: string;
    query?: string;
  }) {
    const report = await this.getBillWiseReport(input);
    return report.bills.map((b) => ({
      Date: b.date,
      Time: b.time,
      'Receipt #': b.receiptNumber,
      'Receipt Type': b.receiptType,
      Cashier: b.cashier,
      Salespeople: b.salespeople.join(', '),
      'Payment Method': b.paymentMethod,
      'Qty Sold': b.qtySold,
      'Total (PKR)': b.total,
      'Customer Name': b.customerName || 'Walk-in',
      'Customer Phone': b.customerPhone || 'N/A',
    }));
  },
};
