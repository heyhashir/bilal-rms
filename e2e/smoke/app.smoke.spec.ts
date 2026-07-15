import { expect, test } from "@playwright/test";
import {
  dismissDialogs,
  loginAsAdmin,
  productImagePath,
  saveModal,
  testData,
} from "../helpers";

test.describe("Bilal RMS smoke", () => {
  test("storefront, admin, POS, and COD checkout flows work", async ({ page }) => {
    dismissDialogs(page);

    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Shop everything." })).toBeVisible();
    await expect(page.getByRole("complementary").getByText("Men", { exact: true })).toBeVisible();

    await loginAsAdmin(page);
    await expect(page.getByText("Today at BALI by Bilal Garments EST 2001.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Control room." })).toBeVisible();

    await page.goto("/admin/categories");
    await page.getByPlaceholder("New category name").fill(testData.categoryName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByText(testData.categoryName)).toBeVisible();

    await page.goto("/admin/brands");
    await page.getByRole("button", { name: /New brand/ }).click();
    await page.getByLabel(/^Name$/).fill(testData.brandName);
    await page.getByLabel(/^Slug$/).fill(testData.brandSlug);
    await page.getByLabel(/^Country$/).fill("Pakistan");
    await saveModal(page);
    await expect(page.getByText(testData.brandName)).toBeVisible();

    await page.goto("/admin/employees");
    await page.getByRole("button", { name: /New employee/ }).click();
    await page.getByLabel(/Full name/i).fill(testData.employeeName);
    await page.getByLabel(/^Phone$/).fill("03001234567");
    await page.getByLabel(/Commission %/i).fill("5");
    await page.getByLabel(/Notes/i).fill("Smoke commission employee");
    await saveModal(page);
    await expect(page.getByText(testData.employeeName)).toBeVisible();

    await page.goto("/admin/products");
    await page.getByRole("button", { name: /Add product/ }).click();
    await page.getByLabel(/^Name$/).fill(testData.productName);
    await page.getByLabel(/^Slug$/).fill(testData.productSlug);
    await page.getByLabel(/^Description$/).fill("Playwright verified product for storefront, POS, and billing.");
    await page.getByLabel(/^Price$/).fill("2500");
    await page.getByLabel(/^Stock$/).fill("12");
    await page.getByLabel(/^Barcode$/).fill(testData.productBarcode);
    await page.getByLabel(/^QR code$/).fill(testData.productQrCode);
    await page.getByLabel(/^Sizes \(comma separated\)$/).fill("M");
    await page.getByLabel(/^Tags \(comma separated\)$/).fill("playwright,smoke");
    await page.getByPlaceholder("Color name").fill("Black");
    await page.locator('input[type="color"]').fill("#111111");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(productImagePath);
    await saveModal(page);
    await expect(page.getByText(testData.productName)).toBeVisible();

    await page.goto("/admin/inventory");
    await page.getByRole("button", { name: /Adjust stock/ }).click();
    await page.getByLabel(/Quantity change/).fill("3");
    await page.getByLabel(/^Note$/).fill("Smoke stock increase");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("Stock updated")).toBeVisible();

    await page.goto("/pos");
    await expect(page.getByRole("heading", { name: "In-store billing." })).toBeVisible();
    await page.getByPlaceholder("Barcode, QR code, SKU, or product name").fill(testData.productBarcode);
    await page.getByRole("button", { name: testData.productName }).first().click();
    await page.locator("tbody select").first().selectOption({ label: testData.employeeName });
    await page.getByLabel(/^Customer name$/).fill(testData.customerName);
    await page.getByLabel(/^Phone$/).fill("03111222333");
    await page.getByRole("button", { name: "Finalize bill" }).click();
    await expect(page.getByText(/Receipt /)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/pos-sales");
    await page.getByPlaceholder("Search...").fill(testData.customerName);
    await expect(page.getByText(testData.customerName)).toBeVisible();
    await page.getByRole("button", { name: "View" }).first().click();
    const posSaleModal = page.locator('[role="dialog"], .fixed.inset-0').last();
    await posSaleModal.locator('input[type="number"]').first().fill("1");
    await posSaleModal.locator('input[type="text"]').first().fill("Smoke refund");
    await page.getByRole("button", { name: /Refund selected/ }).click();
    await expect(page.getByText("Refund processed")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/commissions");
    await expect(page.getByRole("cell", { name: testData.employeeName }).first()).toBeVisible();
    await expect(page.getByText("reversed", { exact: false }).first()).toBeVisible();

    await page.goto("/admin/refunds");
    await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();

    await page.goto("/shop");
    await page.reload();
    await page.goto(`/product/${testData.productSlug}`);
    await expect(page.getByRole("heading", { name: testData.productName })).toBeVisible();
    await page.getByRole("button", { name: "Black" }).click();
    await page.getByRole("button", { name: "M" }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.goto("/cart");
    await expect(page.getByText(testData.productName)).toBeVisible();
    await page.getByRole("link", { name: "Checkout" }).click();
    await page.getByLabel(/^Email$/).fill(testData.onlineCustomerEmail);
    await page.getByLabel(/^Full name$/).fill(testData.onlineCustomerName);
    await page.getByLabel(/^Address$/).fill("123 Test Street");
    await page.getByLabel(/^Postal code$/).fill("54000");
    await page.getByLabel(/^Phone$/).fill("03211234567");
    await page.getByRole("button", { name: "Place order" }).click();
    await expect(page.getByRole("heading", { name: "Thank you!" })).toBeVisible();
    await page.getByRole("link", { name: "Print invoice" }).click();
    await expect(page.getByText("Order invoice")).toBeVisible();

    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: /Customers \(/ })).toBeVisible();
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Range reporting." })).toBeVisible();
    await page.goto("/admin/imports");
    await expect(page.getByText("Product image diagnostics")).toBeVisible();
    await expect(page.getByText("Repair guidance:", { exact: false }).first()).toBeVisible();
  });
});
