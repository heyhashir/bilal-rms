import assert from 'node:assert/strict';
import prisma from '../config/prisma';
import { bootstrapData } from '../bootstrap/seed';
import { inventoryService } from '../services/inventory.service';
import { orderService } from '../services/order.service';
import { posService } from '../services/pos.service';
import { syncService } from '../services/sync.service';
import { ApiError } from '../types/ApiError';

const prefix = `svc-${Date.now().toString(36)}`;

const cleanup = async () => {
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
    (error: unknown) => error instanceof ApiError && error.statusCode === 400,
    'refunding more than the available quantity should be rejected',
  );

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
