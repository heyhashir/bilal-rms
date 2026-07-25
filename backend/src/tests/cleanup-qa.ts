import fs from 'node:fs/promises';
import path from 'node:path';
import prisma from '../config/prisma';
import { env } from '../config/env';

const prefix = process.argv[2]?.trim();

if (!prefix) {
  throw new Error('Usage: npm run qa:cleanup -- <qa-prefix>');
}

const normalizedPrefix = prefix.replace(/[^a-z0-9]/gi, '');

const run = async () => {
  await prisma.$connect();

  const products = await prisma.product.findMany({
    where: {
      OR: [
        { slug: { startsWith: prefix } },
        { name: { startsWith: prefix } },
      ],
    },
    select: { id: true },
  });
  const productIds = products.map((product) => product.id);
  const productImages = productIds.length
    ? await prisma.productImage.findMany({
        where: { productId: { in: productIds } },
        select: { path: true },
      })
    : [];

  const categories = await prisma.category.findMany({
    where: {
      OR: [
        { slug: { startsWith: prefix } },
        { name: { startsWith: prefix } },
      ],
    },
    select: { id: true },
  });
  const categoryIds = categories.map((category) => category.id);

  const brands = await prisma.brand.findMany({
    where: {
      OR: [
        { slug: { startsWith: prefix } },
        { name: { startsWith: prefix } },
      ],
    },
    select: { id: true },
  });
  const brandIds = brands.map((brand) => brand.id);

  const users = await prisma.user.findMany({
    where: {
      OR: [
        { email: { startsWith: prefix } },
        ...(normalizedPrefix && normalizedPrefix !== prefix ? [{ email: { startsWith: normalizedPrefix } }] : []),
      ],
    },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);

  const employees = await prisma.employee.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const employeeIds = employees.map((employee) => employee.id);

  const sales = await prisma.posSale.findMany({
    where: {
      OR: [
        { saleNumber: { startsWith: prefix } },
        { customerName: { startsWith: prefix } },
        { notes: { startsWith: prefix } },
        ...(productIds.length ? [{ items: { some: { productId: { in: productIds } } } }] : []),
        ...(employeeIds.length ? [{ items: { some: { employeeId: { in: employeeIds } } } }] : []),
      ],
    },
    select: { id: true },
  });
  const saleIds = sales.map((sale) => sale.id);

  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { email: { startsWith: prefix } },
        { notes: { startsWith: prefix } },
        ...(normalizedPrefix && normalizedPrefix !== prefix ? [{ email: { startsWith: normalizedPrefix } }] : []),
      ],
    },
    select: { id: true },
  });
  const orderIds = orders.map((order) => order.id);

  await prisma.$transaction(async (tx) => {
    if (saleIds.length || productIds.length || employeeIds.length) {
      await tx.commissionEntry.deleteMany({
        where: {
          OR: [
            ...(saleIds.length ? [{ saleId: { in: saleIds } }] : []),
            ...(productIds.length ? [{ productId: { in: productIds } }] : []),
            ...(employeeIds.length ? [{ employeeId: { in: employeeIds } }] : []),
          ],
        },
      });
    }

    if (saleIds.length || orderIds.length || productIds.length) {
      await tx.inventoryMovement.deleteMany({
        where: {
          OR: [
            ...(saleIds.length ? [{ posSaleId: { in: saleIds } }] : []),
            ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
            ...(productIds.length ? [{ productId: { in: productIds } }] : []),
          ],
        },
      });
      await tx.ledgerEntry.deleteMany({
        where: {
          OR: [
            ...(saleIds.length ? [{ posSaleId: { in: saleIds } }] : []),
            ...(orderIds.length ? [{ orderId: { in: orderIds } }] : []),
            { note: { startsWith: prefix } },
            { reference: { startsWith: prefix } },
          ],
        },
      });
    }

    if (saleIds.length) {
      await tx.posReturn.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.posPayment.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.receipt.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.posSaleItem.deleteMany({ where: { saleId: { in: saleIds } } });
      await tx.posSale.deleteMany({ where: { id: { in: saleIds } } });
    }

    if (orderIds.length) {
      await tx.refundRecord.deleteMany({ where: { returnRequest: { orderId: { in: orderIds } } } });
      await tx.returnRequest.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.paymentProof.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      await tx.order.deleteMany({ where: { id: { in: orderIds } } });
    }

    if (userIds.length) {
      await tx.address.deleteMany({ where: { userId: { in: userIds } } });
      await tx.session.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }

    if (productIds.length) {
      await tx.vendorPurchase.deleteMany({ where: { productId: { in: productIds } } });
      await tx.commissionRule.deleteMany({ where: { productId: { in: productIds } } });
      await tx.productImage.deleteMany({ where: { productId: { in: productIds } } });
      await tx.productVariant.deleteMany({ where: { productId: { in: productIds } } });
      await tx.product.deleteMany({ where: { id: { in: productIds } } });
    }

    if (employeeIds.length) {
      await tx.employee.deleteMany({ where: { id: { in: employeeIds } } });
    }

    if (brandIds.length) {
      await tx.brand.deleteMany({ where: { id: { in: brandIds } } });
    }

    if (categoryIds.length) {
      await tx.category.deleteMany({ where: { id: { in: categoryIds } } });
    }
  });

  await Promise.all(
    productImages.map(async ({ path: imagePath }) => {
      const fileName = path.basename(imagePath);
      await fs.rm(path.join(env.UPLOAD_DIR, 'products', fileName), { force: true });
    }),
  );

  console.log(`Removed QA records with prefix "${prefix}".`);
};

void run()
  .catch((error) => {
    console.error('QA cleanup failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
