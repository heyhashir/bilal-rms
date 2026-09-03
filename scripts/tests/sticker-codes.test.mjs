import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test, mock } from "node:test";

// Database methods are stubbed. Any accidental connection can only target a closed local port.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "mysql://qa:qa@127.0.0.1:1/qa_never_connect";
const require = createRequire(import.meta.url);
// Inject before loading the service: Prisma's runtime proxy cannot be patched with mock.method.
const prisma = { $transaction: async operation => operation({}) };
const prismaPath = require.resolve("../../backend/dist/config/prisma.js");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { __esModule: true, default: prisma } };
const { catalogAdminService } = require("../../backend/dist/services/catalog-admin.service.js");
const { catalogRepository } = require("../../backend/dist/repositories/catalog.repository.js");

test("short barcode generation and reprints preserve stored identities and variant independence", async () => {
  const product = { id: "qa-product", slug: "qa-jeans", name: "QA Jeans", barcode: "PARENT-EXISTING", qrCode: "PARENT-QR", price: 2495, stock: 9, variants: [
    { id: "qa-variant", sku: "COTTONJEAN-BEI-26", barcode: "EXISTING-VARIANT", qrCode: "EXISTING-QR", colorName: "Beige", size: "26", priceOverride: null, stock: 2 },
  ] };
  const writes = [];
  mock.method(catalogRepository, "findStoreSettings", async () => ({ barcodePrefix: "BALY", qrPrefix: "BALYQ", barcodeLabelTemplate: "compact" }));
  mock.method(catalogRepository, "findProductById", async () => product);
  const exists = mock.method(catalogRepository, "barcodeExists", async () => false);
  mock.method(catalogRepository, "updateProductVariantCodes", async (_tx, id, codes) => { writes.push({ id, codes }); });
  mock.method(catalogRepository, "updateProductCodes", async () => { throw new Error("Variant reprint must not change its parent codes"); });
  try {
    exists.mock.mockImplementationOnce(async () => true);
    const generated = await catalogAdminService.generateCodes({ format: "short", seed: "Very Long Product Name" });
    assert.match(generated.barcode, /^[A-Z]{2}-\d{4}$/);
    assert.equal(exists.mock.callCount(), 2, "Existing barcode collision must be retried");
    assert.match((await catalogAdminService.generateCodes({})).barcode, /^[A-Z]{2}-\d{4}$/);
    const original = await catalogAdminService.reprintCodes({ productId: product.id, variantId: "qa-variant" });
    assert.equal(original.barcode, "EXISTING-VARIANT");
    assert.equal(original.qrCode, "EXISTING-QR");
    product.variants[0].barcode = null;
    const assigned = await catalogAdminService.reprintCodes({ productId: product.id, variantId: "qa-variant" });
    assert.match(assigned.barcode, /^[A-Z]{2}-\d{4}$/);
    assert.equal(assigned.sku, "COTTONJEAN-BEI-26");
    assert.equal(assigned.stock, 2);
    assert.equal(assigned.qrCode, "EXISTING-QR");
    assert.equal(writes.at(-1).codes.barcode, assigned.barcode);
    product.variants[0].barcode = assigned.barcode;
    assert.equal((await catalogAdminService.reprintCodes({ productId: product.id, variantId: "qa-variant" })).barcode, assigned.barcode);
    assert.equal(product.barcode, "PARENT-EXISTING");
  } finally {
    mock.restoreAll();
  }
});
