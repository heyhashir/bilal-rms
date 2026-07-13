import { Request, Response } from 'express';
import { ApiResponse } from '../../utils/ApiResponse';
import { inventoryService } from '../../services/inventory.service';
import { logAdminAudit } from '../../utils/adminAudit';
import { buildListMeta, parseListQuery } from '../../utils/list-query';
import { toCsv } from '../../utils/csv';

export const getInventorySnapshot = async (_req: Request, res: Response) => {
  const products = await inventoryService.getInventorySnapshot();
  res.status(200).json(
    ApiResponse.success('Inventory snapshot loaded', {
      products: products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: product.name,
        category: product.category.slug,
        categoryName: product.category.name,
        stockMode: product.stockMode.toLowerCase(),
        stock: product.stockMode === 'VARIANT'
          ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
          : product.stock,
        variants: product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          size: variant.size,
          colorName: variant.colorName,
          stock: variant.stock,
          isActive: variant.isActive,
        })),
        lowStock: (product.stockMode === 'VARIANT'
          ? product.variants.reduce((sum, variant) => sum + variant.stock, 0)
          : product.stock) <= 5,
      })),
    }),
  );
};

export const getInventoryLedger = async (req: Request, res: Response) => {
  const query = parseListQuery(req, { defaultSort: 'createdAt', defaultPageSize: 50 });
  const rows = await inventoryService.getInventoryLedger(query);
  res.status(200).json(
    ApiResponse.success('Inventory ledger loaded', {
      movements: rows.items.map((movement) => ({
        id: movement.id,
        createdAt: movement.createdAt.getTime(),
        productId: movement.productId,
        productName: movement.product.name,
        productSlug: movement.product.slug,
        categoryName: movement.product.category.name,
        variantId: movement.variantId,
        variantSku: movement.variant?.sku ?? '',
        delta: movement.delta,
        reason: movement.reason.toLowerCase(),
        source: movement.source?.toLowerCase() ?? '',
        reference: movement.reference ?? '',
        orderNumber: movement.order?.orderNumber ?? '',
        posSaleNumber: movement.posSale?.saleNumber ?? '',
        posReturnId: movement.posReturnId ?? '',
        note: movement.note,
      })),
      meta: buildListMeta(query, rows.total),
    }),
  );
};

export const exportInventoryLedger = async (req: Request, res: Response) => {
  const rows = await inventoryService.getInventoryLedgerForExport(
    typeof req.query.query === 'string' ? req.query.query.trim() : '',
  );

  const csv = toCsv(
    ['createdAt', 'productName', 'productSlug', 'variantSku', 'reason', 'source', 'delta', 'reference', 'orderNumber', 'posSaleNumber', 'note'],
    rows.map((movement) => ({
      createdAt: movement.createdAt.toISOString(),
      productName: movement.product.name,
      productSlug: movement.product.slug,
      variantSku: movement.variant?.sku ?? '',
      reason: movement.reason,
      source: movement.source ?? '',
      delta: movement.delta,
      reference: movement.reference ?? '',
      orderNumber: movement.order?.orderNumber ?? '',
      posSaleNumber: movement.posSale?.saleNumber ?? '',
      note: movement.note,
    })),
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="inventory-ledger.csv"');
  res.status(200).send(csv);
};

export const adjustInventory = async (req: Request, res: Response) => {
  const input = req.body as {
    productId: string;
    variantId?: string | null;
    delta: number;
    note?: string;
  };
  await inventoryService.adjustInventory(input);
  logAdminAudit(req, {
    action: 'inventory.adjusted',
    targetType: input.variantId ? 'product-variant' : 'product',
    targetId: input.variantId ?? input.productId,
    details: {
      productId: input.productId,
      variantId: input.variantId ?? null,
      delta: input.delta,
      note: input.note ?? '',
    },
  });

  res.status(200).json(ApiResponse.success('Inventory updated', { ok: true }));
};
