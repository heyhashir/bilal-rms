import prisma from '../config/prisma';
import { catalogRepository } from '../repositories/catalog.repository';
import { posRepository, posSaleInclude } from '../repositories/pos.repository';
import { ApiError } from '../types/ApiError';
import { inventoryService } from './inventory.service';

const toNullable = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  return value.trim().length > 0 ? value.trim() : null;
};

const createDocumentNumbers = async () => {
  const settings = await prisma.storeSetting.findFirstOrThrow();
  const suffix = `${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return {
    receiptNumber: `${settings.receiptPrefix}-${suffix}`,
    invoiceNumber: `${settings.invoicePrefix}-${suffix}`,
  };
};

export const posService = {
  listSales: (params?: {
    page: number;
    pageSize: number;
    query?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }) => posRepository.listSales(params),
  listSalesForExport: (query?: string) => posRepository.listSalesForExport(query),
  getSale: (saleNumber: string) => posRepository.findSaleByNumber(saleNumber),
  async recordReceiptReprint(saleNumber: string) {
    const sale = await posRepository.findSaleByNumber(saleNumber);
    if (!sale.receipt) {
      throw new ApiError(404, 'Receipt not found for this sale');
    }

    await posRepository.incrementReceiptReprintBySaleId(sale.id);
    return posRepository.findSaleByNumber(saleNumber);
  },
  async createSale(input: {
    saleNumber?: string;
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    paymentMethod: 'cash' | 'card' | 'jazzcash' | 'easypaisa' | 'bank_transfer';
    paidAmount?: number | null;
    status: 'draft' | 'finalized';
    notes?: string;
    deviceKey?: string;
    deviceName?: string;
    lines: Array<{
      productId: string;
      variantId?: string | null;
      employeeId?: string | null;
      qty: number;
      unitPrice?: number | null;
    }>;
  }) {
    const saleNumber =
      input.saleNumber || `POS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const existing = await posRepository.findSaleByNumberOptional(saleNumber);
    if (existing) {
      return existing;
    }

    const products = await catalogRepository.findProductsByIds(Array.from(new Set(input.lines.map((line) => line.productId))));
    const productMap = new Map(products.map((product) => [product.id, product]));
    const employeeIds = Array.from(
      new Set(input.lines.map((line) => toNullable(line.employeeId)).filter((value): value is string => Boolean(value))),
    );
    const employees = employeeIds.length
      ? await prisma.employee.findMany({
          where: {
            id: { in: employeeIds },
            status: 'ACTIVE',
          },
        })
      : [];
    const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));
    const subtotal = input.lines.reduce((sum, line) => {
      const product = productMap.get(line.productId);
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId) : null;
      const stock = variant ? variant.stock : product.stock;
      if (input.status === 'finalized' && stock < line.qty) {
        throw new ApiError(400, `Insufficient stock for ${product.name}`);
      }

      const unitPrice = line.unitPrice ?? Number(variant?.priceOverride ?? product.salePrice ?? product.price);
      return sum + unitPrice * line.qty;
    }, 0);

    const paidAmount = input.paidAmount ?? subtotal;
    const device =
      input.deviceKey && input.deviceName
        ? await posRepository.upsertRegisterDevice(input.deviceKey, input.deviceName)
        : null;
    const docs = input.status === 'finalized' ? await createDocumentNumbers() : null;

    return prisma.$transaction(async (tx) => {
      const sale = await tx.posSale.create({
        data: {
          saleNumber,
          source: 'POS',
          status: input.status === 'draft' ? 'DRAFT' : 'FINALIZED',
          customerName: toNullable(input.customerName),
          customerPhone: toNullable(input.customerPhone),
          customerEmail: toNullable(input.customerEmail),
          subtotal,
          total: subtotal,
          paidAmount,
          paymentMethod: input.paymentMethod.toUpperCase() as never,
          notes: toNullable(input.notes),
          syncedStatus: device ? 'SYNCED' : 'PENDING',
          syncedAt: device ? new Date() : null,
          finalizedAt: input.status === 'finalized' ? new Date() : null,
          deviceId: device?.id ?? null,
          deviceName: device?.name ?? input.deviceName ?? null,
        },
      });

      for (const line of input.lines) {
        const product = productMap.get(line.productId)!;
        const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId) : null;
        const unitPrice = line.unitPrice ?? Number(variant?.priceOverride ?? product.salePrice ?? product.price);
        const employeeId = toNullable(line.employeeId);
        const employee = employeeId ? employeeMap.get(employeeId) : null;
        const rate = employee ? Number(employee.commissionRate) : null;
        const commissionAmount = employeeId && rate !== null && rate > 0 ? (unitPrice * line.qty * rate) / 100 : null;

        const item = await tx.posSaleItem.create({
          data: {
            saleId: sale.id,
            productId: product.id,
            variantId: variant?.id ?? null,
            employeeId,
            name: product.name,
            slug: product.slug,
            sku: variant?.sku ?? null,
            imagePath: product.images[0]?.path ?? '',
            barcode: variant?.barcode ?? product.barcode ?? null,
            qrCode: variant?.qrCode ?? product.qrCode ?? null,
            size: variant?.size ?? '',
            colorName: variant?.colorName ?? '',
            unitPrice,
            qty: line.qty,
            lineTotal: unitPrice * line.qty,
            commissionRate: rate ?? null,
            commissionAmount,
          },
        });

        if (input.status === 'finalized') {
          await inventoryService.recordPosSale(tx, {
            productId: product.id,
            variantId: variant?.id ?? null,
            qty: line.qty,
            posSaleId: sale.id,
            reference: sale.saleNumber,
          });

          if (employeeId && rate !== null && rate > 0 && commissionAmount !== null) {
            await tx.commissionEntry.create({
              data: {
                employeeId,
                saleId: sale.id,
                saleItemId: item.id,
                productId: product.id,
                variantId: variant?.id ?? null,
                rate,
                amount: commissionAmount,
                status: 'EARNED',
              },
            });
          }
        }
      }

      if (input.status === 'finalized') {
        await tx.posPayment.create({
          data: {
            saleId: sale.id,
            method: input.paymentMethod.toUpperCase() as never,
            amount: paidAmount,
          },
        });

        await tx.receipt.create({
          data: {
            saleId: sale.id,
            receiptNumber: docs!.receiptNumber,
            invoiceNumber: docs!.invoiceNumber,
            lastPrintedAt: new Date(),
          },
        });
      }

      return tx.posSale.findUniqueOrThrow({
        where: { id: sale.id },
        include: posSaleInclude,
      });
    });
  },
  async refundSale(input: {
    saleNumber: string;
    reason: string;
    note?: string;
    items: Array<{ saleItemId: string; qty: number }>;
  }) {
    const sale = await prisma.posSale.findUniqueOrThrow({
      where: { saleNumber: input.saleNumber },
      include: {
        items: true,
      },
    });

    const saleItems = new Map(sale.items.map((item) => [item.id, item]));

    return prisma.$transaction(async (tx) => {
      for (const entry of input.items) {
        const item = saleItems.get(entry.saleItemId);
        if (!item) {
          throw new ApiError(404, 'Sale item not found');
        }

        const remaining = item.qty - item.refundedQty;
        if (entry.qty > remaining) {
          throw new ApiError(400, `Refund quantity exceeds available quantity for ${item.name}`);
        }

        await tx.posSaleItem.update({
          where: { id: item.id },
          data: { refundedQty: { increment: entry.qty } },
        });

        const amount = Number(item.unitPrice) * entry.qty;
        const createdReturn = await tx.posReturn.create({
          data: {
            saleId: sale.id,
            saleItemId: item.id,
            reason: input.reason,
            note: input.note || '',
            qty: entry.qty,
            amount,
          },
        });

        await inventoryService.recordPosRefund(tx, {
          productId: item.productId,
          variantId: item.variantId,
          qty: entry.qty,
          posSaleId: sale.id,
          posReturnId: createdReturn.id,
          reference: sale.saleNumber,
          note: input.reason,
        });

        if (item.employeeId && item.commissionRate && item.commissionAmount) {
          const reversalAmount = Number(item.unitPrice) * entry.qty * (Number(item.commissionRate) / 100);
          await tx.commissionEntry.create({
            data: {
              employeeId: item.employeeId,
              saleId: sale.id,
              saleItemId: item.id,
              productId: item.productId,
              variantId: item.variantId,
              rate: item.commissionRate,
              amount: -reversalAmount,
              status: 'REVERSED',
              note: input.reason,
            },
          });
        }
      }

      const refreshed = await tx.posSale.findUniqueOrThrow({
        where: { id: sale.id },
        include: { items: true },
      });

      if (refreshed.items.every((item) => item.refundedQty >= item.qty)) {
        await tx.posSale.update({
          where: { id: sale.id },
          data: { status: 'REFUNDED' },
        });
      }

      return tx.posSale.findUniqueOrThrow({
        where: { id: sale.id },
        include: posSaleInclude,
      });
    });
  },
};
