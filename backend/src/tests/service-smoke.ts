import assert from 'node:assert/strict';
import prisma from '../config/prisma';
import { bootstrapData } from '../bootstrap/seed';
import { catalogAdminService } from '../services/catalog-admin.service';
import { inventoryService } from '../services/inventory.service';
import { orderService } from '../services/order.service';
import { posService } from '../services/pos.service';
import { formatInvoiceNumber } from '../services/receipt.service';
import { syncService } from '../services/sync.service';
import { ApiError } from '../types/ApiError';
import { compareVersions, newestVersion } from '../utils/versions';

const prefix = `svc-${Date.now().toString(36)}`;

const cleanup = async () => {
  await prisma.ledgerEntry.deleteMany({
    where: { reference: { startsWith: prefix.toUpperCase() } },
  });
  await prisma.syncJob.deleteMany({
    where: {
      OR: [{ entityId: { startsWith: prefix } }, { device: { deviceKey: { startsWith: prefix } } }],
    },
  });
  await prisma.registerDevice.deleteMany({
    where: { deviceKey: { startsWith: prefix } },
  });
  await prisma.posSale.deleteMany({
    where: { saleNumber: { startsWith: prefix.toUpperCase() } },
  });
  await prisma.order.deleteMany({
    where: { email: { startsWith: prefix } },
  });
  await prisma.employee.deleteMany({
    where: { name: { startsWith: prefix } },
  });
  await prisma.commissionRule.deleteMany({
    where: {
      OR: [
        { product: { slug: { startsWith: prefix } } },
        { variant: { sku: { startsWith: prefix.toUpperCase() } } },
      ],
    },
  });
  await prisma.product.deleteMany({
    where: { slug: { startsWith: prefix } },
  });
  await prisma.category.deleteMany({
    where: { slug: { startsWith: prefix } },
  });
};

const run = async () => {
  await prisma.$connect();
  await bootstrapData();
  await cleanup();
  assert.equal(formatInvoiceNumber(1), 'A000001', 'invoice sequence should start at A000001');
  assert.equal(formatInvoiceNumber(999_999), 'A999999', 'invoice sequence should use the full numeric range');
  assert.equal(formatInvoiceNumber(1_000_000), 'B000001', 'invoice sequence should roll over to B000001');
  assert.equal(formatInvoiceNumber(25_999_974), 'Z999999', 'invoice sequence should complete the Z range');
  assert.equal(formatInvoiceNumber(25_999_975), 'AA000001', 'invoice sequence should continue safely after Z');

  const category = await prisma.category.create({
    data: {
      slug: `${prefix}-category`,
      name: `${prefix} Category`,
      description: 'Service smoke category',
    },
  });

  const product = await prisma.product.create({
    data: {
      slug: `${prefix}-product`,
      name: `${prefix} Product`,
      description: 'Service smoke product',
      categoryId: category.id,
      price: 1500,
      stock: 10,
      stockMode: 'SIMPLE',
      sizeChart: 'apparel',
    },
  });

  const employee = await prisma.employee.create({
    data: {
      name: `${prefix} Employee`,
      phone: '03000000000',
      commissionRate: 5,
      notes: 'Service smoke employee',
    },
  });

  const shippingZone = await prisma.shippingZone.findFirstOrThrow({
    orderBy: { createdAt: 'asc' },
  });

  const order = await orderService.checkout({
    input: {
      email: `${prefix}@example.com`,
      customerName: 'Service Smoke Customer',
      phone: '03001234567',
      address: '123 Test Street',
      city: shippingZone.city,
      postal: '54000',
      country: 'Pakistan',
      shippingZoneId: shippingZone.id,
      payment: 'cod',
      lines: [{ productId: product.id, qty: 2 }],
    },
  });

  assert.equal(order.items.length, 1, 'checkout should create one order item');
  assert.equal(order.paymentStatus, 'COD_DUE', 'COD checkout should mark payment as due');

  let refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(refreshedProduct.stock, 8, 'checkout should decrement product stock');

  const orderMovement = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product.id,
      reason: 'ORDER',
      note: order.orderNumber,
    },
  });
  assert.ok(orderMovement, 'checkout should create an order inventory movement');

  const createdReturn = await orderService.createReturn({
    orderNumber: order.orderNumber,
    reason: 'Service smoke return',
    details: 'Full order return',
  });

  const approvedReturn = await orderService.updateReturnStatus({
    returnRequestId: createdReturn.request.id,
    status: 'approved',
    note: 'Service smoke approval',
  });

  assert.equal(approvedReturn.status, 'APPROVED', 'return approval should update return status');

  refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(refreshedProduct.stock, 10, 'return approval should restore stock');

  const returnMovement = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product.id,
      reason: 'RETURN',
      orderId: order.id,
    },
  });
  assert.ok(returnMovement, 'return approval should create a return inventory movement');

  const sale = await posService.createSale({
    saleNumber: prefix.toUpperCase(),
    customerName: 'Walk-in Customer',
    paymentMethod: 'cash',
    paidAmount: 1500,
    status: 'finalized',
    deviceKey: `${prefix}-device`,
    deviceName: 'Service Smoke POS',
    lines: [
      {
        productId: product.id,
        employeeId: employee.id,
        qty: 1,
      },
    ],
  });

  assert.equal(sale.items.length, 1, 'POS finalization should create sale items');
  assert.ok(sale.receipt, 'POS finalization should create a receipt');
  assert.equal(sale.payments.length, 1, 'POS finalization should create a payment');
  assert.match(sale.receipt!.invoiceNumber, /^[A-Z]+[0-9]{6}$/, 'invoice should use the stable sequence format');
  assert.ok((sale.receipt!.invoiceSequence ?? 0) > 0, 'invoice should retain its numeric sequence');
  assert.equal(sale.items[0].retailPrice.toString(), '1500', 'sale item should snapshot the retail price');
  assert.equal(sale.retailSubtotal.toString(), '1500', 'sale should snapshot the retail subtotal');

  const saleByInvoice = await posService.findSale(sale.receipt!.invoiceNumber);
  assert.equal(saleByInvoice.id, sale.id, 'invoice lookup should resolve the exact sale');
  const saleByReceipt = await posService.findSale(sale.receipt!.receiptNumber);
  assert.equal(saleByReceipt.id, sale.id, 'receipt lookup should resolve the exact sale');
  const recordsBeforeReprint = {
    movements: await prisma.inventoryMovement.count({ where: { posSaleId: sale.id } }),
    commissions: await prisma.commissionEntry.count({ where: { saleId: sale.id } }),
    ledgerEntries: await prisma.ledgerEntry.count({ where: { posSaleId: sale.id } }),
  };
  const reprintedSale = await posService.recordReceiptReprint(sale.saleNumber);
  assert.equal(reprintedSale.receipt?.receiptNumber, sale.receipt!.receiptNumber, 'reprint should preserve receipt identity');
  assert.equal(reprintedSale.receipt?.invoiceNumber, sale.receipt!.invoiceNumber, 'reprint should preserve invoice identity');
  assert.equal(reprintedSale.receipt?.reprintCount, 1, 'reprint should increment its audit counter');
  assert.equal(
    await prisma.inventoryMovement.count({ where: { posSaleId: sale.id } }),
    recordsBeforeReprint.movements,
    'reprint should not create stock movements',
  );
  assert.equal(
    await prisma.commissionEntry.count({ where: { saleId: sale.id } }),
    recordsBeforeReprint.commissions,
    'reprint should not create commission entries',
  );
  assert.equal(
    await prisma.ledgerEntry.count({ where: { posSaleId: sale.id } }),
    recordsBeforeReprint.ledgerEntries,
    'reprint should not create ledger entries',
  );

  refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(refreshedProduct.stock, 9, 'POS finalization should decrement stock');

  const posMovement = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product.id,
      reason: 'POS_SALE',
      posSaleId: sale.id,
    },
  });
  assert.ok(posMovement, 'POS finalization should create a POS inventory movement');

  const earnedCommission = await prisma.commissionEntry.findFirst({
    where: {
      saleId: sale.id,
      employeeId: employee.id,
      status: 'EARNED',
    },
  });
  assert.ok(earnedCommission, 'POS finalization should create an earned commission');

  const refundedSale = await posService.refundSale({
    saleNumber: sale.saleNumber,
    reason: 'Service smoke refund',
    items: [{ saleItemId: sale.items[0].id, qty: 1 }],
  });

  assert.equal(refundedSale.returns.length, 1, 'refund should create a POS return');

  refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(refreshedProduct.stock, 10, 'refund should restore stock');

  const refundMovement = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product.id,
      reason: 'POS_REFUND',
      posSaleId: sale.id,
    },
  });
  assert.ok(refundMovement, 'refund should create a POS refund inventory movement');

  const reversedCommission = await prisma.commissionEntry.findFirst({
    where: {
      saleId: sale.id,
      employeeId: employee.id,
      status: 'REVERSED',
    },
  });
  assert.ok(reversedCommission, 'refund should create a reversed commission entry');

  await assert.rejects(
    () =>
      posService.refundSale({
        saleNumber: sale.saleNumber,
        reason: 'Excessive refund attempt',
        items: [{ saleItemId: sale.items[0].id, qty: 1 }],
      }),
    (error: unknown) => error instanceof ApiError && error.statusCode === 409,
    'refunding more than the available quantity should be rejected',
  );

  const voidCandidate = await posService.createSale({
    saleNumber: `${prefix.toUpperCase()}-VOID`,
    customerName: 'Void Customer',
    paymentMethod: 'cash',
    paidAmount: 1500,
    status: 'finalized',
    deviceKey: `${prefix}-device`,
    deviceName: 'Service Smoke POS',
    lines: [{ productId: product.id, employeeId: employee.id, qty: 1 }],
  });
  const admin = await prisma.adminAccount.findFirstOrThrow({ where: { role: 'ADMIN', isActive: true } });
  assert.notEqual(
    voidCandidate.receipt?.receiptNumber,
    sale.receipt?.receiptNumber,
    'separate invoices should receive unique receipt IDs',
  );

  refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  const stockBeforeVoid = refreshedProduct.stock;
  const voidAttempts = await Promise.allSettled([
    posService.voidSale({
      saleNumber: voidCandidate.saleNumber,
      reason: 'Service smoke void',
      adminAccountId: admin.id,
    }),
    posService.voidSale({
      saleNumber: voidCandidate.saleNumber,
      reason: 'Concurrent service smoke void',
      adminAccountId: admin.id,
    }),
  ]);
  const successfulVoid = voidAttempts.find((attempt) => attempt.status === 'fulfilled');
  const rejectedVoid = voidAttempts.find((attempt) => attempt.status === 'rejected');
  assert.ok(successfulVoid?.status === 'fulfilled', 'one concurrent void should succeed');
  assert.ok(
    rejectedVoid?.status === 'rejected' &&
      rejectedVoid.reason instanceof ApiError &&
      rejectedVoid.reason.statusCode === 409,
    'the competing concurrent void should be rejected',
  );
  const voidedSale = successfulVoid.value;

  assert.equal(voidedSale.status, 'VOID', 'void should preserve the sale and mark it void');
  assert.match(voidedSale.voidReason ?? '', /service smoke void/i, 'void should retain the winning correction reason');
  assert.equal(voidedSale.voidedById, admin.id, 'void should retain the responsible admin');

  refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(refreshedProduct.stock, stockBeforeVoid + 1, 'void should restore the exact sold quantity');

  const voidMovement = await prisma.inventoryMovement.findFirst({
    where: { posSaleId: voidCandidate.id, reason: 'POS_VOID' },
  });
  assert.ok(voidMovement, 'void should create a dedicated stock movement');

  const voidCommission = await prisma.commissionEntry.findFirst({
    where: { saleId: voidCandidate.id, status: 'REVERSED', amount: { lt: 0 } },
  });
  assert.ok(voidCommission, 'void should reverse the earned commission');

  const voidLedger = await prisma.ledgerEntry.findFirst({
    where: {
      posSaleId: voidCandidate.id,
      type: 'ADJUSTMENT',
      direction: 'DEBIT',
    },
  });
  assert.ok(voidLedger, 'void should create a financial reversal entry');

  await assert.rejects(
    () =>
      posService.voidSale({
        saleNumber: voidCandidate.saleNumber,
        reason: 'Duplicate void',
        adminAccountId: admin.id,
      }),
    (error: unknown) => error instanceof ApiError && error.statusCode === 409,
    'voiding the same invoice twice should be rejected',
  );

  const variantProduct = await catalogAdminService.saveProduct({
    slug: `${prefix}-variant-product`,
    name: `${prefix} Variant Product`,
    description: 'Service smoke variant product',
    categorySlug: category.slug,
    brandSlug: '',
    stockMode: 'variant',
    price: 1500,
    salePrice: null,
    costPrice: 900,
    stock: 0,
    sizeChart: 'apparel',
    sizes: ['S', 'M'],
    colors: [{ name: 'Black', hex: '#000000' }],
    tags: ['service-smoke'],
    seoTitle: '',
    seoDescription: '',
    featured: false,
    trending: false,
    isActive: true,
    images: [],
    barcode: '',
    qrCode: '',
    supplierBarcode: '',
    video: '',
    commissionRate: null,
    variants: [
      {
        sku: `${prefix.toUpperCase()}-S-BLK`,
        size: 'S',
        colorName: 'Black',
        colorHex: '#000000',
        stock: 5,
        priceOverride: null,
        costPrice: 900,
        isActive: true,
        barcode: `${prefix.toUpperCase()}-S-BAR`,
        qrCode: `${prefix.toUpperCase()}-S-QR`,
        supplierBarcode: '',
        commissionRate: null,
      },
      {
        sku: `${prefix.toUpperCase()}-M-BLK`,
        size: 'M',
        colorName: 'Black',
        colorHex: '#000000',
        stock: 7,
        priceOverride: null,
        costPrice: 900,
        isActive: true,
        barcode: `${prefix.toUpperCase()}-M-BAR`,
        qrCode: `${prefix.toUpperCase()}-M-QR`,
        supplierBarcode: '',
        commissionRate: null,
      },
    ],
  });
  const originalVariantIds = new Map(variantProduct.variants.map((variant) => [variant.size, variant.id]));

  const regeneratedVariantProduct = await catalogAdminService.saveProduct(
    {
      slug: variantProduct.slug,
      name: variantProduct.name,
      description: variantProduct.description,
      categorySlug: category.slug,
      brandSlug: '',
      stockMode: 'variant',
      price: Number(variantProduct.price),
      salePrice: null,
      costPrice: Number(variantProduct.costPrice),
      stock: 0,
      sizeChart: 'apparel',
      sizes: ['S', 'M'],
      colors: [{ name: 'Black', hex: '#000000' }],
      tags: ['service-smoke'],
      seoTitle: '',
      seoDescription: '',
      featured: false,
      trending: false,
      isActive: true,
      images: [],
      barcode: '',
      qrCode: '',
      supplierBarcode: '',
      video: '',
      commissionRate: null,
      variants: variantProduct.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        stock: variant.size === 'S' ? 6 : 7,
        priceOverride: variant.priceOverride ? Number(variant.priceOverride) : null,
        costPrice: variant.costPrice ? Number(variant.costPrice) : null,
        isActive: true,
        barcode: variant.barcode ?? '',
        qrCode: variant.qrCode ?? '',
        supplierBarcode: variant.supplierBarcode ?? '',
        commissionRate: null,
      })),
    },
    variantProduct.id,
  );
  assert.equal(
    regeneratedVariantProduct.variants.find((variant) => variant.size === 'S')?.id,
    originalVariantIds.get('S'),
    'matrix regeneration should preserve matching variant IDs',
  );
  assert.equal(
    regeneratedVariantProduct.variants.find((variant) => variant.size === 'M')?.id,
    originalVariantIds.get('M'),
    'matrix regeneration should preserve every matching variant ID',
  );

  const soldVariant = regeneratedVariantProduct.variants.find((variant) => variant.size === 'S')!;
  const untouchedVariant = regeneratedVariantProduct.variants.find((variant) => variant.size === 'M')!;
  const variantSale = await posService.createSale({
    saleNumber: `${prefix.toUpperCase()}-VARIANT`,
    paymentMethod: 'cash',
    paidAmount: 3000,
    status: 'finalized',
    lines: [{ productId: variantProduct.id, variantId: soldVariant.id, qty: 2 }],
  });
  let soldVariantAfterSale = await prisma.productVariant.findUniqueOrThrow({ where: { id: soldVariant.id } });
  let untouchedVariantAfterSale = await prisma.productVariant.findUniqueOrThrow({ where: { id: untouchedVariant.id } });
  assert.equal(soldVariantAfterSale.stock, 4, 'POS sale should decrement only the selected variant');
  assert.equal(untouchedVariantAfterSale.stock, 7, 'POS sale should not change another variant');

  await posService.refundSale({
    saleNumber: variantSale.saleNumber,
    reason: 'Variant service smoke refund',
    items: [
      { saleItemId: variantSale.items[0].id, qty: 1 },
      { saleItemId: variantSale.items[0].id, qty: 1 },
    ],
  });
  soldVariantAfterSale = await prisma.productVariant.findUniqueOrThrow({ where: { id: soldVariant.id } });
  untouchedVariantAfterSale = await prisma.productVariant.findUniqueOrThrow({ where: { id: untouchedVariant.id } });
  assert.equal(soldVariantAfterSale.stock, 6, 'refund should restore only the returned variant');
  assert.equal(untouchedVariantAfterSale.stock, 7, 'refund should leave unrelated variants unchanged');

  await inventoryService.adjustInventory({
    productId: product.id,
    delta: 4,
    note: prefix,
  });

  refreshedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
  assert.equal(refreshedProduct.stock, 14, 'inventory adjustment should update stock');

  const adjustmentMovement = await prisma.inventoryMovement.findFirst({
    where: {
      productId: product.id,
      reason: 'ADJUSTMENT',
      note: prefix,
    },
  });
  assert.ok(adjustmentMovement, 'inventory adjustment should create an adjustment movement');

  const syncDevice = await syncService.registerDevice(`${prefix}-sync-device`, 'Service Smoke Sync Device', 'Service smoke');
  assert.equal(newestVersion('0.1.1', '0.2.4'), '0.2.4', 'stale configured releases must not override a newer bundled app');
  assert.ok(compareVersions('0.2.10', '0.2.4') > 0, 'desktop versions must compare numerically');

  const syncBootstrap = await syncService.bootstrap(`${prefix}-sync-device`);
  assert.ok(syncBootstrap.cursor, 'sync bootstrap should return a durable cursor');

  const refreshedDevice = await prisma.registerDevice.findUniqueOrThrow({
    where: { id: syncDevice.id },
  });
  assert.equal(refreshedDevice.lastCursor, syncBootstrap.cursor, 'sync bootstrap should persist the latest cursor on the device');

  const firstSyncBatch = await syncService.pushJobs({
    deviceKey: `${prefix}-sync-device`,
    cursor: syncBootstrap.cursor,
    jobs: [
      {
        jobKey: `${prefix}-job-1`,
        direction: 'push',
        entityType: 'pos-sale',
        entityId: `${prefix}-entity`,
        payload: { saleNumber: sale.saleNumber },
        status: 'pending',
      },
    ],
  });

  const duplicateSyncBatch = await syncService.pushJobs({
    deviceKey: `${prefix}-sync-device`,
    cursor: syncBootstrap.cursor,
    jobs: [
      {
        jobKey: `${prefix}-job-1`,
        direction: 'push',
        entityType: 'pos-sale',
        entityId: `${prefix}-entity`,
        payload: { saleNumber: sale.saleNumber },
        status: 'pending',
      },
    ],
  });

  assert.equal(firstSyncBatch.length, 1, 'first sync push should create a sync job');
  assert.equal(duplicateSyncBatch.length, 0, 'duplicate sync push should be rejected');

  const futureVersionManifest = await syncService.getUpdateManifest(`${prefix}-sync-device`, '99.0.0');
  assert.equal(futureVersionManifest.available, false, 'the update channel must never offer a desktop downgrade');

  console.log('Backend service smoke passed');
};

void run()
  .catch((error) => {
    console.error('Backend service smoke failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup().catch(() => undefined);
    await prisma.$disconnect();
  });
