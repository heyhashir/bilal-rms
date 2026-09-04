import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalStore } from '../local-store.mjs';
import { createReceiptHtml } from '../receipt-template.mjs';

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const runtimeDir = await fs.mkdtemp(path.join(os.tmpdir(), 'bilal-rms-desktop-qa-'));

const cache = {
  products: [
    {
      id: 'qa-product',
      slug: 'qa-product',
      name: 'QA Product',
      stockMode: 'simple',
      stock: 5,
      price: 1200,
      salePrice: null,
      images: [],
      variants: [],
    },
  ],
  employees: [],
  settings: {},
  updatedAt: Date.now(),
};

try {
  const store = await createLocalStore({
    userDataPath: runtimeDir,
    cloudApiBaseUrl: 'http://127.0.0.1:5000',
    moduleBasePath: desktopDir,
  });
  store.savePosCache(cache);

  const saleStartedAt = performance.now();
  const receipt = store.persistOfflineSale({
    sale: {
      saleNumber: 'QA-OFFLINE-001',
      customerName: 'QA Customer',
      paymentMethod: 'cash',
      lines: [{ productId: 'qa-product', qty: 2 }],
    },
    employees: [],
    settings: { receiptPrefix: 'REC', invoicePrefix: 'INV', logoPrimaryText: 'BALY' },
  });
  const salePersistenceMs = performance.now() - saleStartedAt;
  assert.ok(salePersistenceMs < 1_000, `offline sale persistence exceeded 1 second (${salePersistenceMs.toFixed(1)} ms)`);

  assert.equal(store.loadPosCache().products[0].stock, 3, 'offline sale must decrement local stock immediately');
  assert.equal(store.loadQueuedSales().length, 1, 'offline sale must enter the durable sync queue');
  assert.equal(store.getOfflineReceipt(receipt.saleNumber)?.receipt?.receiptNumber, 'REC-QA-OFFLINE-001');

  const refundStartedAt = performance.now();
  const refunded = store.persistOfflineRefund({
    refund: {
      jobKey: 'qa-refund-001',
      saleNumber: receipt.saleNumber,
      reason: 'QA refund',
      items: [{ saleItemId: receipt.items[0].id, qty: 1 }],
    },
  });
  const refundPersistenceMs = performance.now() - refundStartedAt;
  assert.ok(refundPersistenceMs < 1_000, `offline refund persistence exceeded 1 second (${refundPersistenceMs.toFixed(1)} ms)`);
  assert.ok(refunded, 'offline refund must find its local receipt');
  assert.equal(store.loadPosCache().products[0].stock, 4, 'offline refund must restore local stock immediately');
  assert.equal(store.loadQueuedRefunds().length, 1, 'offline refund must enter the durable sync queue');

  const exchangeStartedAt = performance.now();
  const replacement = store.persistOfflineExchange({
    exchange: {
      jobKey: 'qa-exchange-001',
      idempotencyKey: 'qa-exchange-001',
      saleNumber: receipt.saleNumber,
      reason: 'QA size exchange',
      paymentMethod: 'cash',
      returns: [{ saleItemId: receipt.items[0].id, qty: 1 }],
      replacements: [{ productId: 'qa-product', qty: 1, unitPrice: 1200 }],
    },
    employees: [],
    settings: { receiptPrefix: 'REC', invoicePrefix: 'INV', logoPrimaryText: 'BALY' },
  });
  const exchangePersistenceMs = performance.now() - exchangeStartedAt;
  assert.ok(exchangePersistenceMs < 1_000, `offline exchange persistence exceeded 1 second (${exchangePersistenceMs.toFixed(1)} ms)`);
  assert.ok(replacement?.sourceExchange, 'offline exchange must create a linked replacement receipt');
  assert.equal(replacement.sourceExchange.settlementDirection, 'even', 'same-value offline exchange should have no settlement');
  assert.equal(store.loadPosCache().products[0].stock, 4, 'offline exchange must atomically restore and consume stock');
  assert.equal(store.loadQueuedExchanges().length, 1, 'offline exchange must enter the durable idempotent queue');

  const printerProfiles = {
    receipt: { printerName: 'QA Receipt Printer', rollWidthMm: 72, paddingMm: 3, feedOffsetMm: 1, copies: 1, landscape: false },
    sticker: { printerName: 'QA Sticker Printer', widthMm: 38, heightMm: 25, orientation: 0, offsetXmm: 1, offsetYmm: 2, gapMm: 3, copies: 1, design: 'standard' },
  };
  store.savePrinterProfiles(printerProfiles);

  const reopenedStore = await createLocalStore({
    userDataPath: runtimeDir,
    cloudApiBaseUrl: 'http://127.0.0.1:5000',
    moduleBasePath: desktopDir,
  });
  assert.equal(reopenedStore.getOfflineReceipt('REC-QA-OFFLINE-001')?.items[0]?.refundedQty, 2, 'refund and exchange receipt updates must survive restart');
  assert.equal(reopenedStore.loadQueuedExchanges()[0]?.idempotencyKey, 'qa-exchange-001', 'exchange queue must survive restart');
  assert.deepEqual(reopenedStore.getPrinterProfiles(), printerProfiles, 'separate receipt and sticker profiles must survive restart');

  const html = createReceiptHtml({ sale: receipt, settings: { logoPrimaryText: 'BALY' } });
  assert.match(html, /@page \{ size: 72mm auto; margin: 0; \}/, 'receipt must target 72 mm printable width');
  assert.match(html, /width: 72mm;/, 'receipt body must not exceed the printer printable width');
  assert.match(html, /BILAL GARMENTS/, 'receipt header must use the requested store name');
  assert.doesNotMatch(html, new RegExp(receipt.receipt.receiptNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '<\/div>'), 'receipt barcode text should not use the long receipt identifier');

  console.log(`Desktop local-store smoke passed (sale ${salePersistenceMs.toFixed(1)} ms, refund ${refundPersistenceMs.toFixed(1)} ms, exchange ${exchangePersistenceMs.toFixed(1)} ms)`);
} finally {
  await fs.rm(runtimeDir, { recursive: true, force: true });
}
