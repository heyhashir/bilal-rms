import { expect, test, type Page } from "@playwright/test";
import type { VendorPurchase } from "../../src/lib/admin-types";

const purchasedAt = Date.UTC(2026, 8, 3);
const purchase = (patch: Partial<VendorPurchase>): VendorPurchase => ({
  id: "purchase-1", vendorId: "vendor-1", vendorName: "QA Mill",
  productId: "product-1", productName: "QA Kurta", variantId: null, variantSku: "",
  quantity: 2, unitCost: 1450, purchasedAt, note: "QA fixture",
  reversedAt: null, reversalReason: "", reversedById: "", createdAt: purchasedAt, updatedAt: purchasedAt,
  ...patch,
});

async function fixtures(page: Page) {
  const state = {
    failHistory: false,
    purchases: [
      purchase({}),
      purchase({ id: "purchase-2", vendorId: "vendor-2", vendorName: "QA Textiles", variantId: "variant-1", variantSku: "QA-BLACK-M", quantity: 3, unitCost: 500 }),
      purchase({ id: "purchase-3", quantity: 10, unitCost: 9000, reversedAt: purchasedAt }),
      purchase({ id: "purchase-4", quantity: 2, unitCost: 0 }),
    ],
    writes: [] as { path: string; body: Record<string, unknown> }[],
    errors: [] as string[],
  };
  page.on("pageerror", error => state.errors.push(error.message));
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    let data: unknown;
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      state.writes.push({ path, body });
      if (path.endsWith("/reverse")) {
        const entry = state.purchases.find(item => path.includes(`/${item.id}/`))!;
        entry.reversedAt = purchasedAt;
        entry.reversalReason = body.reason;
        data = { purchase: entry };
      } else if (path === "/admin/vendor-purchases") {
        const entry = purchase({ ...body, id: "purchase-new", purchasedAt });
        state.purchases.push(entry);
        data = { purchase: entry };
      } else {
        throw new Error(`Unexpected write: ${path}`);
      }
    } else if (path === "/auth/me") {
      data = { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", addresses: [], createdAt: purchasedAt } };
    } else if (path === "/admin/vendors") {
      data = { vendors: [{ id: "vendor-1", name: "QA Mill" }, { id: "vendor-2", name: "QA Textiles" }] };
    } else if (path === "/admin/products") {
      data = { products: [{ id: "product-1", name: "QA Kurta", variants: [] }] };
    } else if (path === "/admin/vendor-purchases") {
      if (state.failHistory) {
        await route.fulfill({ status: 500, json: { success: false, message: "Fixture unavailable" } });
        return;
      }
      data = { purchases: state.purchases };
    } else if (path === "/catalog/settings") {
      data = { settings: null };
    } else if (path === "/catalog/bootstrap" || path === "/categories") {
      data = { categories: [], products: [], settings: null };
    } else {
      throw new Error(`Unexpected read: ${path}`);
    }
    await route.fulfill({ json: { success: true, message: "Fixture", data } });
  });
  return state;
}

const stat = (page: Page, label: string) => page.getByText(label, { exact: true }).locator("..");

test("flat purchase records render, filter and total correctly, including zero costs and reversals", async ({ page }) => {
  const state = await fixtures(page);
  await page.goto("/admin/vendor-purchases");
  await expect(page.getByRole("heading", { name: "Vendor purchases & stock intake." })).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.locator("tbody tr").first()).toContainText("QA Mill");
  await expect(page.locator("tbody tr").first()).toContainText("Rs. 2,900");
  await expect(page.getByText("QA-BLACK-M", { exact: true })).toBeVisible();
  await expect(stat(page, "Total Wholesale Spend")).toContainText("Rs. 4,400");
  await expect(stat(page, "Total Units Received")).toContainText("7 pcs");
  await page.getByRole("combobox", { name: "Filter purchases by vendor" }).selectOption("vendor-2");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(stat(page, "Total Wholesale Spend")).toContainText("Rs. 1,500");
  await page.getByRole("button", { name: "Reverse", exact: true }).click();
  await expect(page.getByText("QA Textiles - QA Kurta (3 pcs)", { exact: true })).toBeVisible();
  await page.getByLabel("Reversal Reason").fill("Fixture return");
  await page.getByRole("button", { name: "Confirm Reversal" }).click();
  await expect(page.locator("tbody tr")).toContainText("Reversed");
  await expect(stat(page, "Total Wholesale Spend")).toContainText("Rs. 0");
  expect(state.writes).toEqual([{ path: "/admin/vendor-purchases/purchase-2/reverse", body: { reason: "Fixture return" } }]);
  expect(state.errors).toEqual([]);
});

test("stock intake submits selected fields and refreshes purchase totals", async ({ page }) => {
  const state = await fixtures(page);
  await page.goto("/admin/vendor-purchases");
  await page.getByLabel("Vendor / Supplier").selectOption("vendor-1");
  await page.getByRole("combobox", { name: /^Product/ }).selectOption("product-1");
  await page.getByLabel("Quantity (Pcs)").fill("4");
  await page.getByLabel("Unit Cost PKR (Wholesale)").fill("125.5");
  await page.getByLabel("Purchase Date").fill("2026-09-03");
  await page.getByLabel("Note / Bill #").fill("QA invoice");
  await page.getByRole("button", { name: "Record Inward Purchase" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(page.locator("tbody tr").last()).toContainText("Rs. 502");
  await expect(stat(page, "Total Wholesale Spend")).toContainText("Rs. 4,902");
  expect(state.writes).toEqual([{ path: "/admin/vendor-purchases", body: {
    vendorId: "vendor-1", productId: "product-1", variantId: null,
    quantity: 4, unitCost: 125.5, purchasedAt: "2026-09-03", note: "QA invoice",
  } }]);
  expect(state.errors).toEqual([]);
});

test("failed history requests show a retry state and recover", async ({ page }) => {
  const state = await fixtures(page);
  state.failHistory = true;
  await page.goto("/admin/vendor-purchases");
  await expect(page.getByText("Purchase history could not be loaded")).toBeVisible();
  state.failHistory = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(4);
  expect(state.errors).toEqual([]);
});
