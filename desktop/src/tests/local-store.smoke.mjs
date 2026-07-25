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

  assert.equal(store.loadPosCache().products[0].stock, 3, 'offline sale must decrement local stock immediately');
  assert.equal(store.loadQueuedSales().length, 1, 'offline sale must enter the durable sync queue');
  assert.equal(store.getOfflineReceipt(receipt.saleNumber)?.receipt?.receiptNumber, 'REC-QA-OFFLINE-001');

  const refunded = store.persistOfflineRefund({
    refund: {
      jobKey: 'qa-refund-001',
      saleNumber: receipt.saleNumber,
      reason: 'QA refund',
      items: [{ saleItemId: receipt.items[0].id, qty: 1 }],
    },
  });
  assert.ok(refunded, 'offline refund must find its local receipt');
  assert.equal(store.loadPosCache().products[0].stock, 4, 'offline refund must restore local stock immediately');
  assert.equal(store.loadQueuedRefunds().length, 1, 'offline refund must enter the durable sync queue');

  const reopenedStore = await createLocalStore({
    userDataPath: runtimeDir,
    cloudApiBaseUrl: 'http://127.0.0.1:5000',
    moduleBasePath: desktopDir,
  });
  assert.equal(reopenedStore.getOfflineReceipt('REC-QA-OFFLINE-001')?.items[0]?.refundedQty, 1, 'receipts must survive restart');

  const html = createReceiptHtml({ sale: receipt, settings: { logoPrimaryText: 'BALY' } });
  assert.match(html, /@page \{ size: 72mm auto; margin: 0; \}/, 'receipt must target 72 mm printable width');
  assert.match(html, /width: 72mm;/, 'receipt body must not exceed the printer printable width');

  console.log('Desktop local-store smoke passed');
} finally {
  await fs.rm(runtimeDir, { recursive: true, force: true });
}
