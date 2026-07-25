import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import prisma from '../config/prisma';
import { bootstrapData } from '../bootstrap/seed';
import { catalogAdminService } from '../services/catalog-admin.service';

const prefix = `qa-import-${Date.now().toString(36)}`;
const csvCell = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;

const run = async () => {
  await prisma.$connect();
  await bootstrapData();
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bilal-rms-import-'));

  try {
    const category = await prisma.category.findFirstOrThrow({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    const csvPath = path.join(tempDir, `${prefix}.csv`);
    const headers = ['slug', 'name', 'description', 'category', 'stockMode', 'price', 'stock', 'sizeChart', 'sizes', 'colors', 'tags', 'images', 'featured', 'trending', 'isActive', 'variants'];
    const values = [
      `${prefix}-product`,
      `${prefix} Product`,
      'CSV import verification product',
      category.slug,
      'simple',
      1250,
      4,
      'apparel',
      'M,L',
      '[]',
      'qa,import',
      '',
      'false',
      'false',
      'true',
      '[]',
    ];
    await fs.writeFile(csvPath, `${headers.join(',')}\n${values.map(csvCell).join(',')}\n`, 'utf8');

    const result = await catalogAdminService.importProductsFromWorkbook(csvPath);
    assert.equal(result.successCount, 1, 'CSV import should create one product');
    assert.equal(result.failureCount, 0, 'CSV import should not report a row failure');
    assert.ok(
      await prisma.product.findUnique({ where: { slug: `${prefix}-product` } }),
      'CSV import should persist the product',
    );

    const legacyPath = path.join(tempDir, `${prefix}.xlsx`);
    await fs.writeFile(legacyPath, 'not a workbook', 'utf8');
    await assert.rejects(
      () => catalogAdminService.importProductsFromWorkbook(legacyPath),
      /Only CSV product imports are currently supported/,
      'XLSX imports must be rejected until a vetted parser is selected',
    );

    console.log('Backend import smoke passed');
  } finally {
    await prisma.product.deleteMany({ where: { slug: { startsWith: prefix } } });
    await fs.rm(tempDir, { recursive: true, force: true });
    await prisma.$disconnect();
  }
};

void run().catch((error) => {
  console.error('Backend import smoke failed');
  console.error(error);
  process.exitCode = 1;
});
