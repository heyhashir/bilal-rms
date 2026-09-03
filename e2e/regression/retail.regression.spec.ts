import { expect, test } from "@playwright/test";
import {
  dismissDialogs,
  loginAsAdmin,
  productImagePath,
  saveModal,
  testData,
} from "../helpers";

test.describe("Bilal RMS regression", () => {
  test("creates retail entities, refunds a POS sale, and reverses commission", async ({ page }) => {
    dismissDialogs(page);
    await loginAsAdmin(page);

    await page.goto("/admin/categories");
    await page.getByPlaceholder("New category or subcategory").fill(testData.categoryName);
    await page.getByRole("button", { name: "Add" }).click();

    await page.goto("/admin/brands");
    await page.getByRole("button", { name: /New brand/ }).click();
    await page.getByLabel(/^Name$/).fill(testData.brandName);
    await page.getByLabel(/^Slug$/).fill(testData.brandSlug);
    await saveModal(page);

    await page.goto("/admin/products");
    await page.getByRole("button", { name: /Add product/ }).click();
    await page.getByLabel(/^Name$/).fill(testData.productName);
    await page.getByLabel(/^Slug$/).fill(testData.productSlug);
    await page.getByLabel(/^Description$/).fill("Regression product");
    await page.locator("label", { hasText: "Category" }).locator("select").selectOption({ label: testData.categoryName });
    await page.getByLabel(/^Price$/).fill("3000");
    await page.getByLabel(/^Stock$/).fill("8");
    await page.getByLabel(/^Barcode$/).fill(testData.productBarcode);
    await page.getByLabel(/^QR code$/).fill(testData.productQrCode);
    await page.getByLabel(/^Sizes \(comma separated\)$/).fill("M");
    await page.getByRole("button", { name: "Black", exact: true }).click();
    await page.getByRole("button", { name: "Add Color" }).click();
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(productImagePath);
    await saveModal(page);

    await page.evaluate(async ({ vendorName, productSlug }) => {
      const request = async (path: string, init?: RequestInit) => {
        const response = await fetch(path, {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            ...init?.headers,
          },
          ...init,
        });
        if (!response.ok) {
          throw new Error(`${path} failed with ${response.status}`);
        }
        return response.json();
      };

      const vendors = await request("/api/v1/admin/vendors", {
        method: "POST",
        body: JSON.stringify({ name: vendorName, isActive: true }),
      });
      const products = await request("/api/v1/admin/products");
      const product = products.data.products.find((entry: { slug: string }) => entry.slug === productSlug);
      if (!product) {
        throw new Error("Regression product was not returned by the admin catalog API");
      }
      await request("/api/v1/admin/vendor-purchases", {
        method: "POST",
        body: JSON.stringify({
          vendorId: vendors.data.vendor.id,
          productId: product.id,
          quantity: 2,
          unitCost: 1450,
          purchasedAt: new Date().toISOString().slice(0, 10),
          note: "Regression vendor intake",
        }),
      });
    }, { vendorName: `${testData.brandName} Vendor`, productSlug: testData.productSlug });

    await page.goto("/admin/vendor-purchases");
    await expect(page.getByText(`${testData.brandName} Vendor`, { exact: true })).toBeVisible();
    await expect(page.getByText(testData.productName, { exact: true })).toBeVisible();

    await page.evaluate(async (employeeName) => {
      const response = await fetch("/api/v1/admin/employees", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: employeeName,
          status: "active",
          commissionRate: 5,
          notes: "Regression fixture employee",
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create regression employee");
      }
    }, testData.employeeName);

    await page.goto("/admin/employees");
    await expect(page.locator("tbody tr").filter({ hasText: testData.employeeName }).first()).toBeVisible();

    await page.goto("/pos");
    await page.getByPlaceholder(/Scan barcode with Honeywell Orbit/).fill(testData.productBarcode);
    await page.getByRole("button", { name: testData.productName }).first().click();
    await page.locator("tbody select").first().selectOption({ label: testData.employeeName });
    await page.getByLabel(/^Customer name$/).fill(testData.customerName);
    await page.getByRole("button", { name: "Finalize bill" }).click();
    await expect(page.getByText(/Receipt /)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/commissions");
    const commissionRow = page.locator("tbody tr").filter({ hasText: testData.employeeName }).first();
    await expect(commissionRow).toBeVisible();
    await expect(commissionRow).toContainText(/earned/i);

    await page.goto("/admin/pos-sales");
    await page.getByPlaceholder("Search...").fill(testData.customerName);
    await page.getByRole("button", { name: "View" }).first().click();
    await page.getByText("Refund qty").locator("xpath=ancestor::div[1]").locator("input").fill("1");
    await page.getByText("Refund reason").locator("xpath=ancestor::label[1]").locator("input").fill("Customer returned item");
    await page.getByRole("button", { name: /Refund selected/ }).click();
    await expect(page.getByText("Refund processed")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/commissions");
    await expect(page.locator("tbody tr").filter({ hasText: testData.employeeName }).first()).toContainText(/reversed/i);
  });
});
