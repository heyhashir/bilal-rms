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
    await page.getByPlaceholder("New category name").fill(testData.categoryName);
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
    await page.getByLabel(/^Price$/).fill("3000");
    await page.getByLabel(/^Stock$/).fill("8");
    await page.getByLabel(/^Barcode$/).fill(testData.productBarcode);
    await page.getByLabel(/^QR code$/).fill(testData.productQrCode);
    await page.getByLabel(/^Commission %$/).fill("5");
    await page.getByLabel(/^Sizes \(comma separated\)$/).fill("M");
    await page.getByPlaceholder("Color name").fill("Black");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.locator('label:has-text("Upload") input[type="file"]').setInputFiles(productImagePath);
    await saveModal(page);

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
    await page.getByPlaceholder("Barcode, QR code, SKU, or product name").fill(testData.productBarcode);
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
