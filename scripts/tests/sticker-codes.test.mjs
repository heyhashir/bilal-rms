import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test, mock } from "node:test";

// Database methods are stubbed. Any accidental connection can only target a closed local port.
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "mysql://qa:qa@127.0.0.1:1/qa_never_connect";
const require = createRequire(import.meta.url);
// Inject before loading the service: Prisma's runtime proxy cannot be patched with mock.method.
const prisma = {
  $transaction: async operation => operation({}),
  brand: {
    findUnique: async () => null,
    findFirst: async () => null,
    update: async () => ({}),
    upsert: async () => ({}),
  },
};
const prismaPath = require.resolve("../../backend/dist/config/prisma.js");
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { __esModule: true, default: prisma } };
// Barcode operations must not load local credentials or touch managed uploads.
const maintenancePath = require.resolve("../../backend/dist/utils/file-maintenance.js");
const unexpectedFileAccess = () => { throw new Error("Barcode test must not access managed files"); };
require.cache[maintenancePath] = { id: maintenancePath, filename: maintenancePath, loaded: true, exports: {
  collectMissingManagedFiles: unexpectedFileAccess,
  deleteUploadIfManaged: unexpectedFileAccess,
} };
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

test("reprintCodes includes brandName when product has a brand", async () => {
  const productWithBrand = {
    id: "qa-branded-product",
    slug: "qa-shirt",
    name: "QA Shirt",
    barcode: "SHIRT-1",
    qrCode: "SHIRT-QR",
    price: 1500,
    stock: 5,
    brand: { id: "brand-1", name: "Baly Studio", slug: "baly-studio" },
    variants: [],
  };
  mock.method(catalogRepository, "findStoreSettings", async () => ({ barcodePrefix: "BALY", qrPrefix: "BALYQ", barcodeLabelTemplate: "standard" }));
  mock.method(catalogRepository, "findProductById", async () => productWithBrand);
  mock.method(catalogRepository, "updateProductCodes", async () => {});
  try {
    const label = await catalogAdminService.reprintCodes({ productId: productWithBrand.id });
    assert.equal(label.brandName, "Baly Studio");
  } finally {
    mock.restoreAll();
  }
});

test("brand upsert updates existing brand when id is provided", async () => {
  const brandWrites = [];
  mock.method(prisma.brand, "findUnique", async ({ where }) => (where.id === "brand-existing" ? { id: "brand-existing", slug: "old-slug", name: "Old Name" } : null));
  mock.method(prisma.brand, "update", async (args) => { brandWrites.push({ action: "update", ...args }); return args.data; });
  mock.method(prisma.brand, "upsert", async (args) => { brandWrites.push({ action: "upsert", ...args }); return args.create; });
  try {
    await catalogAdminService.saveBrand({
      id: "brand-existing",
      name: "New Name",
      slug: "new-slug",
      status: "active",
    });
    assert.equal(brandWrites.length, 1);
    assert.equal(brandWrites[0].action, "update");
    assert.equal(brandWrites[0].where.id, "brand-existing");
    assert.equal(brandWrites[0].data.name, "New Name");
  } finally {
    mock.restoreAll();
  }
});
