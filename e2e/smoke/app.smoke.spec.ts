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
    await expect(page.getByText("Today at BALY by Bilal Garments EST 2001.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Control room." })).toBeVisible();

    await page.goto("/admin/categories");
    await page.getByPlaceholder("New category or subcategory").fill(testData.categoryName);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.locator("div.font-medium", { hasText: testData.categoryName }).last()).toBeVisible();

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
    await page.locator("label", { hasText: "Category" }).locator("select").selectOption({ label: testData.categoryName });
    await page.getByLabel(/^Price$/).fill("2500");
    await page.getByLabel(/^Stock$/).fill("12");
    await page.getByLabel(/^Barcode$/).fill(testData.productBarcode);
    await page.getByLabel(/^QR code$/).fill(testData.productQrCode);
    await page.getByLabel(/^Sizes \(comma separated\)$/).fill("M");
    await page.getByLabel(/^Tags \(comma separated\)$/).fill("playwright,smoke");
    await page.getByRole("button", { name: "Black", exact: true }).click();
    await expect(page.getByPlaceholder(/Color name/)).toHaveValue("Black");
    await page.getByRole("button", { name: "Add Color" }).click();
    await expect(page.getByText("Black", { exact: true }).last()).toBeVisible();
    await page.locator('input[type="file"][accept="image/*"]').first().setInputFiles(productImagePath);
    await saveModal(page);
    await expect(page.getByText(testData.productName, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/inventory");
    await page.getByRole("button", { name: /Adjust stock/i }).click();
    await page.locator("label", { hasText: "Product" }).locator("select").selectOption({ label: `${testData.productName} (12 on hand)` });
    await page.getByLabel(/Quantity adjustment/i).fill("3");
    await page.getByLabel(/Reason \/ Note/i).fill("Smoke stock increase");
    await page.getByRole("button", { name: "Save Adjustment" }).click();
    await expect(page.getByText("Stock updated")).toBeVisible();

    await page.goto("/pos");
    const posHeading = page.getByRole("heading", { name: "In-store billing." });
    await expect(posHeading).toBeVisible();
    const scanInput = page.getByPlaceholder(/Scan barcode with Honeywell Orbit/);
    await scanInput.fill(testData.productBarcode);
    await expect(page.locator("button").filter({ hasText: testData.productName }).first()).toBeVisible();
    await scanInput.fill("");
    await posHeading.click();
    await page.keyboard.type(testData.productBarcode, { delay: 1 });
    await page.keyboard.press("Enter");
    await expect(page.getByRole("cell", { name: testData.productName })).toBeVisible();
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
    await expect(page.getByText("cancelled", { exact: false }).first()).toBeVisible();

    await page.goto("/admin/refunds");
    await expect(page.getByRole("heading", { name: "Refunds" })).toBeVisible();

    await page.goto("/shop");
    await page.reload();
    await page.goto(`/product/${testData.productSlug}`);
    await expect(page.getByRole("heading", { name: testData.productName })).toBeVisible();
    await page.getByRole("button", { name: "Black" }).click();
    await page.getByRole("button", { name: "M", exact: true }).click();
    await page.getByRole("button", { name: "Add to cart" }).click();
    await page.goto("/cart");
    await expect(page.getByText(testData.productName)).toBeVisible();
    await page.getByRole("link", { name: "Checkout" }).click();
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(testData.onlineCustomerEmail);
    await page.getByRole("textbox", { name: "First name" }).fill(testData.onlineCustomerName);
    await page.getByRole("textbox", { name: "Last name" }).fill("Customer");
    await page.getByRole("textbox", { name: "Address", exact: true }).fill("123 Test Street");
    await page.getByRole("textbox", { name: "Postal code (optional)" }).fill("54000");
    await page.getByRole("textbox", { name: "Phone (03XX-XXXXXXX)" }).fill("03211234567");
    await page.getByRole("button", { name: "Complete order" }).click();
    await expect(page.getByRole("heading", { name: "Thank you for your order!" })).toBeVisible();
    await page.getByRole("link", { name: "View Invoice" }).click();
    await expect(page.getByText("Order invoice")).toBeVisible();

    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: /Customers \(/ })).toBeVisible();
    await page.goto("/admin/reports");
    await expect(page.getByRole("heading", { name: "Revenue, profit & loss." })).toBeVisible();
    await page.goto("/admin/imports");
    await expect(page.getByText("Product image diagnostics")).toBeVisible();
    await expect(page.getByText("Repair guidance:", { exact: false }).first()).toBeVisible();
  });
});
