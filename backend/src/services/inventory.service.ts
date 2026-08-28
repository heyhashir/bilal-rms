import { Prisma } from '../generated/prisma/client';
import prisma from '../config/prisma';
import { inventoryRepository } from '../repositories/inventory.repository';
import { ApiError } from '../types/ApiError';
import { decimalToNumber } from '../utils/serializers';

type DbClient = Prisma.TransactionClient | typeof prisma;

type StockMutationInput = {
  productId: string;
  variantId?: string | null;
  delta: number;
  reason:
    | 'ORDER'
    | 'ORDER_VOID'
    | 'RETURN'
    | 'ADJUSTMENT'
    | 'RESTOCK'
    | 'PURCHASE_VOID'
    | 'POS_SALE'
    | 'POS_REFUND'
    | 'POS_VOID';
  source?: 'ONLINE' | 'POS';
  reference?: string | null;
  orderId?: string | null;
  posSaleId?: string | null;
  posReturnId?: string | null;
  note?: string | null;
};

export const inventoryService = {
  async applyStockMutation(db: DbClient, input: StockMutationInput): Promise<void> {
    if (input.variantId) {
      const result = await inventoryRepository.adjustVariantStock(db, input.variantId, input.delta);
      if (result.count !== 1) {
        throw new ApiError(409, 'Variant stock changed or is insufficient; refresh and try again');
      }
    } else {
      const result = await inventoryRepository.adjustProductStock(db, input.productId, input.delta);
      if (result.count !== 1) {
        throw new ApiError(409, 'Product stock changed or is insufficient; refresh and try again');
      }
    }

    await inventoryRepository.createMovement(db, input);
  },
  async adjustInventory(input: {
    productId: string;
    variantId?: string | null;
    delta: number;
    note?: string;
  }): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await inventoryService.applyStockMutation(tx, {
        productId: input.productId,
        variantId: input.variantId ?? null,
        delta: input.delta,
        reason: 'ADJUSTMENT',
        note: input.note || null,
      });
    });
  },
  recordOrderSale(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; orderId: string; reference: string }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: -input.qty,
      reason: 'ORDER',
      source: 'ONLINE',
      orderId: input.orderId,
      reference: input.reference,
      note: input.reference,
    });
  },
  recordOrderReturn(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; orderId: string; reference: string; note?: string | null }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.qty,
      reason: 'RETURN',
      source: 'ONLINE',
      orderId: input.orderId,
      reference: input.reference,
      note: input.note ?? input.reference,
    });
  },
  recordPosSale(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; posSaleId: string; reference: string }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: -input.qty,
      reason: 'POS_SALE',
      source: 'POS',
      posSaleId: input.posSaleId,
      reference: input.reference,
      note: input.reference,
    });
  },
  recordPosRefund(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; posSaleId: string; posReturnId: string; reference: string; note?: string | null }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.qty,
      reason: 'POS_REFUND',
      source: 'POS',
      posSaleId: input.posSaleId,
      posReturnId: input.posReturnId,
      reference: input.reference,
      note: input.note ?? input.reference,
    });
  },
  recordOrderVoid(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; orderId: string; reference: string; note: string }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.qty,
      reason: 'ORDER_VOID',
      source: 'ONLINE',
      orderId: input.orderId,
      reference: input.reference,
      note: input.note,
    });
  },
  recordPosVoid(db: DbClient, input: { productId: string; variantId?: string | null; qty: number; posSaleId: string; reference: string; note: string }) {
    return inventoryService.applyStockMutation(db, {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.qty,
      reason: 'POS_VOID',
      source: 'POS',
      posSaleId: input.posSaleId,
      reference: input.reference,
      note: input.note,
    });
  },
  getInventorySnapshot() {
    return inventoryRepository.listSnapshot();
  },
  getInventoryLedger(params?: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }) {
    return inventoryRepository.listLedger(params);
  },
  getInventoryLedgerForExport(query?: string) {
    return inventoryRepository.listLedgerForExport(query);
  },
  async getInventoryValuation(params?: {
    categoryId?: string;
    brandId?: string;
    inStockOnly?: boolean;
    query?: string;
  }) {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        ...(params?.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params?.brandId ? { brandId: params.brandId } : {}),
        ...(params?.query
          ? {
              OR: [
                { name: { contains: params.query } },
                { slug: { contains: params.query } },
                { barcode: { contains: params.query } },
                { category: { name: { contains: params.query } } },
                { variants: { some: { sku: { contains: params.query } } } },
                { variants: { some: { barcode: { contains: params.query } } } },
              ],
            }
          : {}),
      },
      include: {
        category: true,
        brand: true,
        variants: true,
      },
      orderBy: [
        { category: { name: 'asc' } },
        { name: 'asc' },
      ],
    });

    type ValuationLine = {
      id: string;
      productId: string;
      productName: string;
      productSlug: string;
      variantId: string | null;
      barcode: string;
      deptName: string;
      categorySlug: string;
      brandName: string;
      colorName: string;
      colorHex: string;
      size: string;
      costPrice: number;
      retailPrice: number;
      stock: number;
      extCost: number;
      extRetail: number;
    };

    const items: ValuationLine[] = [];

    for (const product of products) {
      const pCost = decimalToNumber(product.costPrice) ?? 0;
      const pRetail = decimalToNumber(product.price) ?? 0;

      if (product.stockMode === 'VARIANT' && product.variants.length > 0) {
        for (const variant of product.variants) {
          if (!variant.isActive) continue;
          if (params?.inStockOnly && variant.stock <= 0) continue;

          const vCost = decimalToNumber(variant.costPrice) ?? pCost;
          const vRetail = decimalToNumber(variant.priceOverride) ?? pRetail;
          const vBarcode = variant.barcode || variant.sku || product.barcode || product.id.slice(0, 8).toUpperCase();
          const extCost = Math.round(vCost * variant.stock * 100) / 100;
          const extRetail = Math.round(vRetail * variant.stock * 100) / 100;

          items.push({
            id: `var_${variant.id}`,
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            variantId: variant.id,
            barcode: vBarcode,
            deptName: product.category.name,
            categorySlug: product.category.slug,
            brandName: product.brand?.name ?? '',
            colorName: variant.colorName || '-',
            colorHex: variant.colorHex || '#000000',
            size: variant.size || '-',
            costPrice: vCost,
            retailPrice: vRetail,
            stock: variant.stock,
            extCost,
            extRetail,
          });
        }
      } else {
        if (params?.inStockOnly && product.stock <= 0) continue;

        const barcode = product.barcode || product.id.slice(0, 8).toUpperCase();
        const extCost = Math.round(pCost * product.stock * 100) / 100;
        const extRetail = Math.round(pRetail * product.stock * 100) / 100;

        items.push({
          id: `prod_${product.id}`,
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          variantId: null,
          barcode,
          deptName: product.category.name,
          categorySlug: product.category.slug,
          brandName: product.brand?.name ?? '',
          colorName: '-',
          colorHex: '#000000',
          size: '-',
          costPrice: pCost,
          retailPrice: pRetail,
          stock: product.stock,
          extCost,
          extRetail,
        });
      }
    }

    // Group items by Department
    const groupMap = new Map<string, {
      deptName: string;
      categorySlug: string;
      items: ValuationLine[];
      totalUnits: number;
      totalCost: number;
      totalRetail: number;
      averageCost: number;
    }>();

    for (const item of items) {
      if (!groupMap.has(item.deptName)) {
        groupMap.set(item.deptName, {
          deptName: item.deptName,
          categorySlug: item.categorySlug,
          items: [],
          totalUnits: 0,
          totalCost: 0,
          totalRetail: 0,
          averageCost: 0,
        });
      }
      const group = groupMap.get(item.deptName)!;
      group.items.push(item);
      group.totalUnits += item.stock;
      group.totalCost = Math.round((group.totalCost + item.extCost) * 100) / 100;
      group.totalRetail = Math.round((group.totalRetail + item.extRetail) * 100) / 100;
    }

    // Calculate group average costs
    const groups = Array.from(groupMap.values()).map((group) => ({
      ...group,
      averageCost: group.totalUnits > 0 ? Math.round((group.totalCost / group.totalUnits) * 100) / 100 : 0,
    }));

    // Calculate Store-Wide Grand Totals
    const totalItems = items.length;
    const totalUnits = items.reduce((sum, item) => sum + item.stock, 0);
    const totalCost = Math.round(items.reduce((sum, item) => sum + item.extCost, 0) * 100) / 100;
    const totalRetail = Math.round(items.reduce((sum, item) => sum + item.extRetail, 0) * 100) / 100;
    const averageUnitCost = totalUnits > 0 ? Math.round((totalCost / totalUnits) * 100) / 100 : 0;
    const projectedProfit = Math.round((totalRetail - totalCost) * 100) / 100;
    const projectedMarginPercent = totalRetail > 0 ? Math.round(((projectedProfit / totalRetail) * 100) * 10) / 10 : 0;

    return {
      asOfDate: new Date().toISOString().slice(0, 10),
      groups,
      summary: {
        totalItems,
        totalUnits,
        totalCost,
        totalRetail,
        averageUnitCost,
        projectedProfit,
        projectedMarginPercent,
      },
    };
  },
  async getInventoryValuationForExport(params?: {
    categoryId?: string;
    brandId?: string;
    inStockOnly?: boolean;
    query?: string;
  }) {
    const valuation = await inventoryService.getInventoryValuation(params);
    const rows: Array<Record<string, string | number>> = [];

    for (const group of valuation.groups) {
      for (const item of group.items) {
        rows.push({
          'Item #': item.barcode,
          'Dept Name': item.deptName,
          'Colour': item.colorName,
          'Item Name': item.productName,
          'Size': item.size,
          'Unit Cost': item.costPrice,
          'Unit Retail': item.retailPrice,
          'Cmp Qty': item.stock,
          'Ext Cost': item.extCost,
          'Ext Retail': item.extRetail,
          'Brand': item.brandName,
        });
      }
      // Add Department subtotal row
      rows.push({
        'Item #': '',
        'Dept Name': `${group.deptName} SUBTOTAL`,
        'Colour': '',
        'Item Name': `Average Cost: ${group.averageCost}`,
        'Size': '',
        'Unit Cost': group.averageCost,
        'Unit Retail': '',
        'Cmp Qty': group.totalUnits,
        'Ext Cost': group.totalCost,
        'Ext Retail': group.totalRetail,
        'Brand': '',
      });
    }

    // Add Grand Total row
    rows.push({
      'Item #': '',
      'Dept Name': 'GRAND TOTAL',
      'Colour': '',
      'Item Name': `Overall Average Cost: ${valuation.summary.averageUnitCost}`,
      'Size': '',
      'Unit Cost': valuation.summary.averageUnitCost,
      'Unit Retail': '',
      'Cmp Qty': valuation.summary.totalUnits,
      'Ext Cost': valuation.summary.totalCost,
      'Ext Retail': valuation.summary.totalRetail,
      'Brand': '',
    });

    return rows;
  },
};
