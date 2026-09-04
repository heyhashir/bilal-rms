import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mock, test } from "node:test";

const require = createRequire(import.meta.url);
const prismaPath = require.resolve("../../backend/dist/config/prisma.js");
// No database is needed or reachable from this fixture-only reporting test.
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { __esModule: true, default: {} } };
const { reportRepository } = require("../../backend/dist/repositories/report.repository.js");
const { reportService } = require("../../backend/dist/services/report.service.js");

test("paid commission is not deducted twice from remaining payable commission", async () => {
  const entries = [
    { employeeId: "qa-employee", employee: { name: "QA Employee" }, saleItem: { productId: "qa-product", name: "QA Product" }, status: "PAID", amount: 118, cancelledAmount: 0 },
  ];
  for (const method of ["listDeliveredOrders", "listPosSales", "listLedgerEntries", "listVendorPurchases"]) {
    mock.method(reportRepository, method, async () => []);
  }
  mock.method(reportRepository, "countOperationalOrders", async () => 0);
  mock.method(reportRepository, "listCommissionEntries", async () => entries);
  try {
    const paidOnly = await reportService.getSummary({});
    assert.equal(paidOnly.commissions.paid, 118);
    assert.equal(paidOnly.commissions.payable, 0);
    assert.equal(paidOnly.employees[0].payable, 0);
    assert.equal(paidOnly.products[0].payable, 0);

    entries.push({ ...entries[0], status: "EARNED", amount: 50 });
    const mixed = await reportService.getSummary({});
    assert.equal(mixed.commissions.payable, 50);
    assert.equal(mixed.employees[0].payable, 50);
    assert.equal(mixed.products[0].payable, 50);
  } finally {
    mock.restoreAll();
  }
});
