import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import initSqlJs from "sql.js";

const now = () => Date.now();

const ensureDir = (targetPath) => {
  fs.mkdirSync(targetPath, { recursive: true });
};

const parseJson = (value, fallback = null) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const escapeText = (value) => String(value ?? "");

const buildReceiptFromPayload = ({ sale, employees, settings, cache }) => {
  const cachedProducts = cache?.products ?? [];
  const employeeMap = new Map((employees ?? []).map((employee) => [employee.id, employee]));
  const saleNumber = sale.saleNumber ?? `OFF-${Date.now().toString(36).toUpperCase()}`;
  const createdAt = now();
  const items = sale.lines.map((line, index) => {
    const product = cachedProducts.find((entry) => entry.id === line.productId);
    const variant = product?.variants.find((entry) => entry.id === line.variantId);
    const unitPrice = line.unitPrice ?? variant?.priceOverride ?? product?.salePrice ?? product?.price ?? 0;
    const retailPrice = variant?.priceOverride ?? product?.price ?? unitPrice;
    return {
      id: `${saleNumber}-${index}`,
      productId: line.productId,
      variantId: line.variantId ?? null,
      employeeId: line.employeeId ?? "",
      employeeName: employeeMap.get(line.employeeId ?? "")?.name ?? "",
      name: product?.name ?? "Product",
      slug: product?.slug ?? "",
      sku: variant?.sku ?? "",
      image: product?.images?.[0] ?? "",
      barcode: variant?.barcode ?? product?.barcode ?? "",
      qrCode: variant?.qrCode ?? product?.qrCode ?? "",
      size: variant?.size ?? "",
      color: variant?.colorName ?? "",
      qty: line.qty,
      refundedQty: 0,
      unitPrice,
      retailPrice,
      lineTotal: unitPrice * line.qty,
      commissionRate: null,
      commissionAmount: null,
    };
  });
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const retailSubtotal = items.reduce((sum, item) => sum + item.retailPrice * item.qty, 0);
  const paidAmount = sale.paidAmount ?? subtotal;

  return {
    id: saleNumber,
    saleNumber,
    source: "pos",
    status: sale.status ?? "finalized",
    customerName: sale.customerName ?? "",
    customerPhone: sale.customerPhone ?? "",
    customerEmail: sale.customerEmail ?? "",
    subtotal,
    retailSubtotal,
    discountTotal: Math.max(0, retailSubtotal - subtotal),
    total: subtotal,
    paidAmount,
    changeAmount: sale.paymentMethod === "cash" ? Math.max(0, paidAmount - subtotal) : 0,
    paymentMethod: sale.paymentMethod,
    notes: sale.notes ?? "",
    syncedStatus: "pending",
    syncedAt: null,
    finalizedAt: createdAt,
    deviceId: sale.deviceKey ?? "",
    deviceName: sale.deviceName ?? "Shop POS",
    voidReason: "",
    voidedAt: null,
    voidedById: "",
    voidedByName: "",
    receipt: {
      id: saleNumber,
      receiptNumber: `${settings?.receiptPrefix ?? "REC"}-${saleNumber}`,
      invoiceNumber: `${settings?.invoicePrefix ?? "BG"}-${saleNumber}`,
      invoiceSequence: null,
      documentSnapshot: settings
        ? {
            version: 1,
            store: {
              name: settings.name,
              logoPrimaryText: settings.logoPrimaryText,
              logoSecondaryText: settings.logoSecondaryText,
              logoTertiaryText: settings.logoTertiaryText,
              logoPath: settings.receiptLogoPath,
              address: settings.address,
              phone: settings.phone,
              taxNumber: settings.taxNumber,
              currencyCode: settings.currency,
              currencySymbol: settings.currencySymbol,
            },
            receipt: {
              header: settings.thermalHeader,
              footer: settings.thermalFooter,
              thankYou: settings.receiptThankYou,
              guaranteePolicy: settings.guaranteePolicy,
              exchangePolicy: settings.exchangePolicy,
              returnPolicy: settings.returnPolicy,
              saleItemPolicy: settings.saleItemPolicy,
              notes: settings.receiptNotes,
            },
          }
        : null,
      reprintCount: 0,
      lastPrintedAt: createdAt,
    },
    items,
    payments: [],
    returns: [],
    createdAt,
    updatedAt: createdAt,
  };
};

const applyRefundToCache = ({ cache, receipt, items }) => {
  if (!cache) {
    return cache;
  }

  const refundItems = items
    .map((entry) => {
      const saleItem = receipt.items.find((item) => item.id === entry.saleItemId);
      return saleItem ? { saleItem, qty: entry.qty } : null;
    })
    .filter(Boolean);

  const nextProducts = cache.products.map((product) => {
    const affected = refundItems.filter((entry) => entry.saleItem.productId === product.id);
    if (affected.length === 0) {
      return product;
    }

    let nextProduct = { ...product, variants: [...product.variants] };
    for (const entry of affected) {
      if (entry.saleItem.variantId) {
        nextProduct = {
          ...nextProduct,
          variants: nextProduct.variants.map((variant) =>
            variant.id === entry.saleItem.variantId ? { ...variant, stock: variant.stock + entry.qty } : variant,
          ),
        };
      } else {
        nextProduct = { ...nextProduct, stock: nextProduct.stock + entry.qty };
      }
    }

    const totalVariantStock = nextProduct.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return nextProduct.stockMode === "variant" ? { ...nextProduct, stock: totalVariantStock } : nextProduct;
  });

  return {
    ...cache,
    products: nextProducts,
    updatedAt: now(),
  };
};

const applySaleToCache = ({ cache, receipt }) => {
  if (!cache) {
    return cache;
  }

  const nextProducts = cache.products.map((product) => {
    const affected = receipt.items.filter((item) => item.productId === product.id);
    if (affected.length === 0) {
      return product;
    }

    let nextProduct = { ...product, variants: [...product.variants] };
    for (const item of affected) {
      if (item.variantId) {
        nextProduct = {
          ...nextProduct,
          variants: nextProduct.variants.map((variant) =>
            variant.id === item.variantId
              ? { ...variant, stock: Math.max(0, variant.stock - item.qty) }
              : variant,
          ),
        };
      } else {
        nextProduct = { ...nextProduct, stock: Math.max(0, nextProduct.stock - item.qty) };
      }
    }

    const totalVariantStock = nextProduct.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return nextProduct.stockMode === "variant" ? { ...nextProduct, stock: totalVariantStock } : nextProduct;
  });

  return {
    ...cache,
    products: nextProducts,
    updatedAt: now(),
  };
};

const readRows = (statement) => {
  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
};

export const createLocalStore = async ({ userDataPath, cloudApiBaseUrl, appVersion = "0.1.0", moduleBasePath }) => {
  ensureDir(userDataPath);

  const dbPath = path.join(userDataPath, "pos.sqlite");
  const sql = await initSqlJs({
    locateFile: (file) => pathToFileURL(path.join(moduleBasePath, "node_modules", "sql.js", "dist", file)).href,
  });
  const db = fs.existsSync(dbPath) ? new sql.Database(fs.readFileSync(dbPath)) : new sql.Database();

  const persist = () => {
    const binary = db.export();
    fs.writeFileSync(dbPath, Buffer.from(binary));
  };

  db.run(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queued_sales (
      sale_number TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS queued_refunds (
      job_key TEXT PRIMARY KEY,
      sale_number TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipts (
      sale_number TEXT PRIMARY KEY,
      receipt_number TEXT,
      invoice_number TEXT,
      sale_json TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  persist();

  const getState = (key, fallback = null) => {
    const stmt = db.prepare("SELECT value FROM app_state WHERE key = ?");
    stmt.bind([key]);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return parseJson(row?.value ?? null, fallback);
  };

  const setState = (key, value) => {
    db.run(
      `
        INSERT INTO app_state (key, value, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `,
      [key, JSON.stringify(value), now()],
    );
    persist();
  };

  const getDeviceKey = () => {
    const existing = getState("device_key", null);
    if (typeof existing === "string" && existing.length > 0) {
      return existing;
    }

    const next = `pos-${crypto.randomUUID()}`;
    setState("device_key", next);
    return next;
  };

  const loadQueuedSales = () => {
    const stmt = db.prepare("SELECT payload_json FROM queued_sales ORDER BY created_at ASC");
    const rows = readRows(stmt);
    return rows.map((row) => parseJson(row.payload_json, null)).filter(Boolean);
  };

  const loadQueuedRefunds = () => {
    const stmt = db.prepare("SELECT payload_json FROM queued_refunds ORDER BY created_at ASC");
    const rows = readRows(stmt);
    return rows.map((row) => parseJson(row.payload_json, null)).filter(Boolean);
  };

  const rememberReceipt = (sale) => {
    db.run(
      `
        INSERT INTO receipts (sale_number, receipt_number, invoice_number, sale_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(sale_number) DO UPDATE SET
          receipt_number = excluded.receipt_number,
          invoice_number = excluded.invoice_number,
          sale_json = excluded.sale_json,
          updated_at = excluded.updated_at
      `,
      [
        sale.saleNumber,
        sale.receipt?.receiptNumber ?? null,
        sale.receipt?.invoiceNumber ?? null,
        JSON.stringify(sale),
        sale.createdAt ?? now(),
        now(),
      ],
    );
    persist();
  };

  const store = {
    dbPath,
    cloudApiBaseUrl: cloudApiBaseUrl || null,
    getDeviceKey,
    loadPosCache: () => getState("pos_cache", null),
    savePosCache: (cache) => setState("pos_cache", cache),
    loadPosSyncState: () => getState("pos_sync_state", null),
    savePosSyncState: (state) => setState("pos_sync_state", state),
    patchPosSyncState: (patch) => {
      const deviceKey = patch.deviceKey ?? getDeviceKey();
      const current = getState("pos_sync_state", {
        deviceKey,
        lastCursor: null,
        lastBootstrapAt: null,
        lastSyncAttemptAt: null,
        lastSuccessfulSyncAt: null,
        lastSyncError: "",
        retryCount: 0,
        failedJobs: 0,
        queueSize: loadQueuedSales().length,
      });
      const next = {
        ...current,
        ...patch,
        deviceKey,
      };
      setState("pos_sync_state", next);
      return next;
    },
    loadQueuedSales,
    loadQueuedRefunds,
    queuePosSale: (sale) => {
      db.run(
        `
          INSERT INTO queued_sales (sale_number, payload_json, created_at, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(sale_number) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at
        `,
        [sale.saleNumber ?? `queued-${crypto.randomUUID()}`, JSON.stringify(sale), now(), now()],
      );
      persist();
    },
    removeQueuedSale: (saleNumber) => {
      db.run("DELETE FROM queued_sales WHERE sale_number = ?", [saleNumber]);
      persist();
    },
    queuePosRefund: (refund) => {
      db.run(
        `
          INSERT INTO queued_refunds (job_key, sale_number, payload_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(job_key) DO UPDATE SET payload_json = excluded.payload_json, updated_at = excluded.updated_at
        `,
        [refund.jobKey, refund.saleNumber, JSON.stringify(refund), now(), now()],
      );
      persist();
    },
    removeQueuedRefund: (jobKey) => {
      db.run("DELETE FROM queued_refunds WHERE job_key = ?", [jobKey]);
      persist();
    },
    persistOfflineSale: ({ sale, employees, settings }) => {
      const cache = getState("pos_cache", null);
      const receipt = buildReceiptFromPayload({ sale, employees, settings, cache });
      store.queuePosSale({ ...sale, saleNumber: receipt.saleNumber });
      rememberReceipt(receipt);
      const nextCache = applySaleToCache({ cache, receipt });
      if (nextCache) {
        setState("pos_cache", nextCache);
      }
      return receipt;
    },
    persistOfflineRefund: ({ refund }) => {
      const receipt = store.getOfflineReceipt(refund.saleNumber);
      if (!receipt) {
        return null;
      }

      const nextReceipt = {
        ...receipt,
        status: receipt.items.every((item) => {
          const requested = refund.items.find((entry) => entry.saleItemId === item.id)?.qty ?? 0;
          return item.refundedQty + requested >= item.qty;
        })
          ? "refunded"
          : receipt.status,
        returns: [
          ...receipt.returns,
          ...refund.items.map((entry) => {
            const saleItem = receipt.items.find((item) => item.id === entry.saleItemId);
            return {
              id: `${refund.jobKey}:${entry.saleItemId}`,
              saleItemId: entry.saleItemId,
              qty: entry.qty,
              amount: (saleItem?.unitPrice ?? 0) * entry.qty,
              reason: refund.reason,
              note: refund.note ?? "",
              createdAt: now(),
            };
          }),
        ],
        items: receipt.items.map((item) => {
          const refundEntry = refund.items.find((entry) => entry.saleItemId === item.id);
          return refundEntry ? { ...item, refundedQty: item.refundedQty + refundEntry.qty } : item;
        }),
        updatedAt: now(),
      };

      store.queuePosRefund(refund);
      rememberReceipt(nextReceipt);
      const cache = getState("pos_cache", null);
      const nextCache = applyRefundToCache({ cache, receipt: nextReceipt, items: refund.items });
      if (nextCache) {
        setState("pos_cache", nextCache);
      }
      return nextReceipt;
    },
    rememberReceipt,
    listOfflineReceipts: () => {
      const stmt = db.prepare("SELECT sale_json FROM receipts ORDER BY updated_at DESC");
      const rows = readRows(stmt);
      return rows.map((row) => parseJson(row.sale_json, null)).filter(Boolean);
    },
    getOfflineReceipt: (receiptOrSaleNumber) => {
      const needle = escapeText(receiptOrSaleNumber).trim().toLowerCase();
      if (!needle) {
        return null;
      }

      const stmt = db.prepare(
        "SELECT sale_json FROM receipts WHERE lower(sale_number) = ? OR lower(receipt_number) = ? OR lower(invoice_number) = ? LIMIT 1",
      );
      stmt.bind([needle, needle, needle]);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return parseJson(row?.sale_json ?? null, null);
    },
    cacheCurrentUser: (user) => setState("cached_current_user", user),
    getCachedCurrentUser: () => getState("cached_current_user", null),
    getDesktopContext: () => ({
      appName: "Bilal RMS POS",
      appVersion,
      cloudApiBaseUrl: store.cloudApiBaseUrl,
    }),
  };

  return store;
};
