import type { Prisma } from '../generated/prisma/client';
import prisma from '../config/prisma';
import { catalogRepository } from '../repositories/catalog.repository';
import { posRepository, posSaleInclude } from '../repositories/pos.repository';
import { ApiError } from '../types/ApiError';
import { inventoryService } from './inventory.service';
import { receiptService } from './receipt.service';

const toNullable = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  return value.trim().length > 0 ? value.trim() : null;
};

const lockSaleForCorrection = async (tx: Prisma.TransactionClient, saleNumber: string) => {
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM pos_sales
    WHERE saleNumber = ${saleNumber}
    FOR UPDATE
  `;
  if (!rows[0]) {
    throw new ApiError(404, 'POS sale not found');
  }
  return rows[0].id;
};

const cancelUnpaidCommission = async (
  tx: Prisma.TransactionClient,
  item: {
    id: string;
    employeeId: string | null;
    commissionRate: Prisma.Decimal | null;
    unitPrice: Prisma.Decimal;
  },
  qty: number,
  note: string,
) => {
  if (!item.employeeId || !item.commissionRate || Number(item.commissionRate) <= 0) {
    return;
  }

  const commission = await tx.commissionEntry.findFirst({
    where: { saleItemId: item.id, status: 'EARNED' },
    orderBy: { createdAt: 'asc' },
  });
  if (!commission) {
    return;
  }

  const cancellation = Number(item.unitPrice) * qty * (Number(item.commissionRate) / 100);
  const cancelledAmount = Math.min(Number(commission.amount), Number(commission.cancelledAmount) + cancellation);
  await tx.commissionEntry.update({
    where: { id: commission.id },
    data: {
      cancelledAmount,
      status: cancelledAmount >= Number(commission.amount) ? 'CANCELLED' : 'EARNED',
      note: [commission.note, note].filter(Boolean).join(' | '),
    },
  });
};

const makeExchangeNumber = () =>
  `EX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

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
  async findSale(identifier: string) {
    const normalized = identifier.trim();
    if (!normalized) {
      throw new ApiError(400, 'Invoice number, receipt ID, or sale number is required');
    }

    const sale = await posRepository.findSaleByIdentifier(normalized);
    if (!sale) {
      throw new ApiError(404, 'Invoice not found');
    }

    return sale;
  },
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
    cashierAccountId?: string | null;
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
    const retailSubtotal = input.lines.reduce((sum, line) => {
      const product = productMap.get(line.productId)!;
      const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId) : null;
      const retailPrice = Number(variant?.priceOverride ?? product.price);
      return sum + retailPrice * line.qty;
    }, 0);
    const discountTotal = Math.max(0, retailSubtotal - subtotal);

    const paidAmount = input.paidAmount ?? subtotal;
    const device =
      input.deviceKey && input.deviceName
        ? await posRepository.upsertRegisterDevice(input.deviceKey, input.deviceName)
        : null;
    const changeAmount = input.paymentMethod === 'cash' ? Math.max(0, paidAmount - subtotal) : 0;

    return prisma.$transaction(async (tx) => {
      const settings = input.status === 'finalized' ? await tx.storeSetting.findFirstOrThrow() : null;
      const docs = settings ? await receiptService.allocateDocumentNumbers(tx, settings) : null;
      const sale = await tx.posSale.create({
        data: {
          saleNumber,
          source: 'POS',
          status: input.status === 'draft' ? 'DRAFT' : 'FINALIZED',
          customerName: toNullable(input.customerName),
          customerPhone: toNullable(input.customerPhone),
          customerEmail: toNullable(input.customerEmail),
          subtotal,
          retailSubtotal,
          discountTotal,
          total: subtotal,
          paidAmount,
          changeAmount,
          paymentMethod: input.paymentMethod.toUpperCase() as never,
          notes: toNullable(input.notes),
          syncedStatus: device ? 'SYNCED' : 'PENDING',
          syncedAt: device ? new Date() : null,
          finalizedAt: input.status === 'finalized' ? new Date() : null,
          deviceId: device?.id ?? null,
          deviceName: device?.name ?? input.deviceName ?? null,
          cashierAccountId: input.cashierAccountId ?? null,
        },
      });

      for (const line of input.lines) {
        const product = productMap.get(line.productId)!;
        const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId) : null;
        const unitPrice = line.unitPrice ?? Number(variant?.priceOverride ?? product.salePrice ?? product.price);
        const retailPrice = Number(variant?.priceOverride ?? product.price);
        const unitCost = Number(variant?.costPrice ?? product.costPrice ?? 0);
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
            retailPrice,
            unitCost,
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
            invoiceSequence: docs!.invoiceSequence,
            lookupCode: docs!.lookupCode,
            documentSnapshot: docs!.documentSnapshot,
            lastPrintedAt: new Date(),
          },
        });

        await tx.ledgerEntry.create({
          data: {
            type: 'SALE',
            direction: 'CREDIT',
            amount: subtotal,
            reference: sale.saleNumber,
            note: `POS sale ${sale.saleNumber}`,
            posSaleId: sale.id,
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
    items: Array<{ saleItemId: string; qty: number; returnVariantId?: string | null; returnVariantLabel?: string | null }>;
  }) {
    return prisma.$transaction(async (tx) => {
      const saleId = await lockSaleForCorrection(tx, input.saleNumber);
      const sale = await tx.posSale.findUniqueOrThrow({
        where: { id: saleId },
        include: { items: true },
      });
      if (sale.status !== 'FINALIZED') {
        throw new ApiError(409, 'Only finalized invoices can be refunded');
      }

      const saleItems = new Map(sale.items.map((item) => [item.id, item]));

      let refundTotal = 0;
      for (const entry of input.items) {
        if (!entry.qty || entry.qty <= 0) continue;
        const item = saleItems.get(entry.saleItemId);
        if (!item) {
          throw new ApiError(404, 'Sale item not found');
        }

        const remaining = item.qty - item.refundedQty;
        if (entry.qty > remaining) {
          throw new ApiError(400, `Refund quantity exceeds available quantity for ${item.name}`);
        }

        const updatedItem = await tx.posSaleItem.updateMany({
          where: {
            id: item.id,
            refundedQty: { lte: item.qty - entry.qty },
          },
          data: { refundedQty: { increment: entry.qty } },
        });
        if (updatedItem.count !== 1) {
          throw new ApiError(409, `Refund quantity changed for ${item.name}; refresh and try again`);
        }

        const amount = Number(item.unitPrice) * entry.qty;
        refundTotal += amount;
        const effectiveVariantId = entry.returnVariantId !== undefined ? entry.returnVariantId : item.variantId;
        const returnNote = [
          input.note || '',
          entry.returnVariantLabel ? `Returned variant: ${entry.returnVariantLabel}` : '',
        ].filter(Boolean).join(' | ');

        const createdReturn = await tx.posReturn.create({
          data: {
            saleId: sale.id,
            saleItemId: item.id,
            reason: input.reason,
            note: returnNote,
            qty: entry.qty,
            amount,
          },
        });

        await inventoryService.recordPosRefund(tx, {
          productId: item.productId,
          variantId: effectiveVariantId,
          qty: entry.qty,
          posSaleId: sale.id,
          posReturnId: createdReturn.id,
          reference: sale.saleNumber,
          note: returnNote || input.reason,
        });

        await cancelUnpaidCommission(tx, item, entry.qty, `Refund: ${input.reason}`);
      }

      if (refundTotal > 0) {
        await tx.ledgerEntry.create({
          data: {
            type: 'ADJUSTMENT',
            direction: 'DEBIT',
            amount: refundTotal,
            reference: `REF-${Date.now().toString(36).toUpperCase()}`,
            note: `POS refund: ${input.reason}`,
            posSaleId: sale.id,
          },
        });
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
  async voidSale(input: {
    saleNumber: string;
    reason: string;
    adminAccountId: string;
  }) {
    return prisma.$transaction(async (tx) => {
      const saleId = await lockSaleForCorrection(tx, input.saleNumber);
      const sale = await tx.posSale.findUniqueOrThrow({
        where: { id: saleId },
        include: {
          items: true,
          returns: true,
          commissions: true,
          ledgerEntries: true,
        },
      });
      if (sale.status === 'VOID') {
        throw new ApiError(409, 'This invoice has already been voided');
      }
      if (sale.status !== 'FINALIZED') {
        throw new ApiError(409, 'Only finalized invoices can be voided');
      }
      if (sale.returns.length > 0 || sale.items.some((item) => item.refundedQty > 0)) {
        throw new ApiError(409, 'Invoices with returns or refunds cannot be voided');
      }

      for (const item of sale.items) {
        await inventoryService.recordPosVoid(tx, {
          productId: item.productId,
          variantId: item.variantId,
          qty: item.qty,
          posSaleId: sale.id,
          reference: sale.saleNumber,
          note: input.reason,
        });
      }

      for (const item of sale.items) {
        await cancelUnpaidCommission(tx, item, item.qty, `Invoice void: ${input.reason}`);
      }

      const saleCredit = sale.ledgerEntries.find(
        (entry) => entry.type === 'SALE' && entry.direction === 'CREDIT' && Number(entry.amount) > 0,
      );
      if (saleCredit) {
        await tx.ledgerEntry.create({
          data: {
            type: 'ADJUSTMENT',
            direction: 'DEBIT',
            amount: sale.total,
            reference: sale.saleNumber,
            note: `Invoice void: ${input.reason}`,
            posSaleId: sale.id,
            adminAccountId: input.adminAccountId,
          },
        });
      }

      await tx.posSale.update({
        where: { id: sale.id },
        data: {
          status: 'VOID',
          voidReason: input.reason,
          voidedAt: new Date(),
          voidedById: input.adminAccountId,
        },
      });

      return tx.posSale.findUniqueOrThrow({
        where: { id: sale.id },
        include: posSaleInclude,
      });
    });
  },
  async exchangeSale(input: {
    saleNumber: string;
    idempotencyKey: string;
    reason: string;
    note?: string;
    paymentMethod?: 'cash' | 'card' | 'jazzcash' | 'easypaisa' | 'bank_transfer' | null;
    operatorId?: string | null;
    deviceKey?: string;
    deviceName?: string;
    returns: Array<{ saleItemId: string; productId?: string; variantId?: string | null; qty: number }>;
    replacements: Array<{
      productId: string;
      variantId?: string | null;
      employeeId?: string | null;
      qty: number;
      unitPrice?: number | null;
    }>;
  }) {
    const existing = await prisma.posExchange.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      include: { replacementSale: { include: posSaleInclude } },
    });
    if (existing) {
      return existing.replacementSale;
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const saleId = await lockSaleForCorrection(tx, input.saleNumber);
        const sourceSale = await tx.posSale.findUniqueOrThrow({
          where: { id: saleId },
          include: { items: true, payments: true },
        });
        if (!['FINALIZED', 'REFUNDED'].includes(sourceSale.status)) {
          throw new ApiError(409, 'Only finalized invoices can be exchanged');
        }

        const sourceItems = new Map(sourceSale.items.map((item) => [item.id, item]));
        let returnedValue = 0;
        for (const entry of input.returns) {
          const item = sourceItems.get(entry.saleItemId) ?? sourceSale.items.find((candidate) =>
            entry.productId === candidate.productId &&
            (entry.variantId ?? null) === (candidate.variantId ?? null) &&
            candidate.qty - candidate.refundedQty >= entry.qty,
          );
          if (!item) throw new ApiError(404, 'Original sale item not found');
          if (entry.qty > item.qty - item.refundedQty) {
            throw new ApiError(400, `Exchange quantity exceeds available quantity for ${item.name}`);
          }
          returnedValue += Number(item.unitPrice) * entry.qty;
        }

        const products = await tx.product.findMany({
          where: { id: { in: Array.from(new Set(input.replacements.map((line) => line.productId))) }, isActive: true },
          include: { images: true, variants: true },
        });
        const productMap = new Map(products.map((product) => [product.id, product]));
        const employeeIds = Array.from(new Set(input.replacements.map((line) => toNullable(line.employeeId)).filter(Boolean))) as string[];
        const employees = employeeIds.length
          ? await tx.employee.findMany({ where: { id: { in: employeeIds }, status: 'ACTIVE' } })
          : [];
        const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

        const preparedLines = input.replacements.map((line) => {
          const product = productMap.get(line.productId);
          if (!product) throw new ApiError(404, 'Replacement product not found or inactive');
          const variant = line.variantId ? product.variants.find((entry) => entry.id === line.variantId && entry.isActive) : null;
          if (line.variantId && !variant) throw new ApiError(404, `Replacement variant not found for ${product.name}`);
          const unitPrice = line.unitPrice ?? Number(variant?.priceOverride ?? product.salePrice ?? product.price);
          const retailPrice = Number(variant?.priceOverride ?? product.price);
          return { line, product, variant, unitPrice, retailPrice };
        });
        const replacementValue = preparedLines.reduce((sum, entry) => sum + entry.unitPrice * entry.line.qty, 0);
        const replacementRetailValue = preparedLines.reduce((sum, entry) => sum + entry.retailPrice * entry.line.qty, 0);
        const difference = Math.round((replacementValue - returnedValue) * 100) / 100;
        const settlementDirection = difference > 0 ? 'COLLECT' : difference < 0 ? 'REFUND' : 'EVEN';
        const settlementAmount = Math.abs(difference);
        if (settlementAmount > 0 && !input.paymentMethod) {
          throw new ApiError(400, 'A payment method is required for the exchange difference');
        }

        const settings = await tx.storeSetting.findFirstOrThrow();
        const docs = await receiptService.allocateDocumentNumbers(tx, settings);
        const device = input.deviceKey
          ? await tx.registerDevice.upsert({
              where: { deviceKey: input.deviceKey },
              update: { name: input.deviceName ?? 'Desktop POS', lastSeenAt: new Date(), lastSyncAt: new Date(), syncStatus: 'SYNCED' },
              create: { deviceKey: input.deviceKey, name: input.deviceName ?? 'Desktop POS', lastSeenAt: new Date(), lastSyncAt: new Date(), syncStatus: 'SYNCED' },
            })
          : null;
        const replacementSale = await tx.posSale.create({
          data: {
            saleNumber: `POS-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
            source: 'POS',
            status: 'FINALIZED',
            customerName: sourceSale.customerName,
            customerPhone: sourceSale.customerPhone,
            customerEmail: sourceSale.customerEmail,
            subtotal: replacementValue,
            retailSubtotal: replacementRetailValue,
            discountTotal: Math.max(0, replacementRetailValue - replacementValue),
            total: replacementValue,
            paidAmount: settlementDirection === 'COLLECT' ? settlementAmount : 0,
            changeAmount: 0,
            paymentMethod: (input.paymentMethod?.toUpperCase() ?? sourceSale.paymentMethod ?? 'CASH') as never,
            notes: `Exchange for ${sourceSale.saleNumber}${input.note ? ` | ${input.note}` : ''}`,
            syncedStatus: input.deviceKey ? 'SYNCED' : 'PENDING',
            syncedAt: input.deviceKey ? new Date() : null,
            finalizedAt: new Date(),
            deviceId: device?.id ?? null,
            deviceName: input.deviceName ?? null,
            cashierAccountId: input.operatorId ?? null,
          },
        });
        const exchange = await tx.posExchange.create({
          data: {
            exchangeNumber: makeExchangeNumber(),
            idempotencyKey: input.idempotencyKey,
            sourceSaleId: sourceSale.id,
            replacementSaleId: replacementSale.id,
            returnedValue,
            replacementValue,
            settlementDirection,
            settlementAmount,
            settlementMethod: input.paymentMethod?.toUpperCase() as never,
            reason: input.reason,
            note: input.note ?? '',
            operatorId: input.operatorId ?? null,
          },
        });

        for (const entry of input.returns) {
          const item = sourceItems.get(entry.saleItemId) ?? sourceSale.items.find((candidate) =>
            entry.productId === candidate.productId &&
            (entry.variantId ?? null) === (candidate.variantId ?? null) &&
            candidate.qty - candidate.refundedQty >= entry.qty,
          );
          if (!item) throw new ApiError(409, 'The original exchange line can no longer be resolved');
          const updated = await tx.posSaleItem.updateMany({
            where: { id: item.id, refundedQty: { lte: item.qty - entry.qty } },
            data: { refundedQty: { increment: entry.qty } },
          });
          if (updated.count !== 1) throw new ApiError(409, `Exchange quantity changed for ${item.name}; refresh and try again`);
          const returned = await tx.posReturn.create({
            data: {
              saleId: sourceSale.id,
              saleItemId: item.id,
              exchangeId: exchange.id,
              reason: input.reason,
              note: input.note ?? '',
              qty: entry.qty,
              amount: Number(item.unitPrice) * entry.qty,
            },
          });
          await inventoryService.recordPosRefund(tx, {
            productId: item.productId,
            variantId: item.variantId,
            qty: entry.qty,
            posSaleId: sourceSale.id,
            posReturnId: returned.id,
            reference: exchange.exchangeNumber,
            note: `Exchange return: ${input.reason}`,
          });
          await cancelUnpaidCommission(tx, item, entry.qty, `Exchange: ${input.reason}`);
        }

        for (const entry of preparedLines) {
          const employeeId = toNullable(entry.line.employeeId);
          const employee = employeeId ? employeeMap.get(employeeId) : null;
          if (employeeId && !employee) throw new ApiError(400, 'Replacement salesperson is inactive or invalid');
          const rate = employee ? Number(employee.commissionRate) : null;
          const amount = employee && rate && rate > 0 ? entry.unitPrice * entry.line.qty * rate / 100 : null;
          const item = await tx.posSaleItem.create({
            data: {
              saleId: replacementSale.id,
              productId: entry.product.id,
              variantId: entry.variant?.id ?? null,
              employeeId,
              name: entry.product.name,
              slug: entry.product.slug,
              sku: entry.variant?.sku ?? null,
              imagePath: entry.product.images[0]?.path ?? '',
              barcode: entry.variant?.barcode ?? entry.product.barcode,
              qrCode: entry.variant?.qrCode ?? entry.product.qrCode,
              size: entry.variant?.size ?? '',
              colorName: entry.variant?.colorName ?? '',
              unitPrice: entry.unitPrice,
              retailPrice: entry.retailPrice,
              unitCost: Number(entry.variant?.costPrice ?? entry.product.costPrice ?? 0),
              qty: entry.line.qty,
              lineTotal: entry.unitPrice * entry.line.qty,
              commissionRate: rate,
              commissionAmount: amount,
            },
          });
          await inventoryService.recordPosSale(tx, {
            productId: entry.product.id,
            variantId: entry.variant?.id ?? null,
            qty: entry.line.qty,
            posSaleId: replacementSale.id,
            reference: exchange.exchangeNumber,
          });
          if (employeeId && rate && amount) {
            await tx.commissionEntry.create({
              data: { employeeId, saleId: replacementSale.id, saleItemId: item.id, productId: entry.product.id, variantId: entry.variant?.id ?? null, rate, amount },
            });
          }
        }

        if (settlementDirection === 'COLLECT') {
          await tx.posPayment.create({
            data: { saleId: replacementSale.id, method: input.paymentMethod!.toUpperCase() as never, amount: settlementAmount, reference: exchange.exchangeNumber },
          });
        }
        await tx.receipt.create({
          data: {
            saleId: replacementSale.id,
            receiptNumber: docs.receiptNumber,
            invoiceNumber: docs.invoiceNumber,
            invoiceSequence: docs.invoiceSequence,
            lookupCode: docs.lookupCode,
            documentSnapshot: docs.documentSnapshot,
            lastPrintedAt: new Date(),
          },
        });
        await tx.ledgerEntry.createMany({
          data: [
            { type: 'SALE', direction: 'CREDIT', amount: replacementValue, reference: exchange.exchangeNumber, note: `Exchange replacement ${replacementSale.saleNumber}`, posSaleId: replacementSale.id },
            { type: 'ADJUSTMENT', direction: 'DEBIT', amount: returnedValue, reference: exchange.exchangeNumber, note: `Exchange return ${sourceSale.saleNumber}`, posSaleId: sourceSale.id, adminAccountId: input.operatorId ?? null },
          ],
        });
        const refreshedSource = await tx.posSale.findUniqueOrThrow({ where: { id: sourceSale.id }, include: { items: true } });
        if (refreshedSource.items.every((item) => item.refundedQty >= item.qty)) {
          await tx.posSale.update({ where: { id: sourceSale.id }, data: { status: 'REFUNDED' } });
        }

        return tx.posSale.findUniqueOrThrow({ where: { id: replacementSale.id }, include: posSaleInclude });
      });
    } catch (error) {
      const duplicate = await prisma.posExchange.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        include: { replacementSale: { include: posSaleInclude } },
      });
      if (duplicate) return duplicate.replacementSale;
      throw error;
    }
  },
};
