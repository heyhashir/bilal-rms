import { expect, test } from "@playwright/test";
import { dismissDialogs, loginAsAdmin } from "../helpers";

test.describe("Bilal RMS live-safe smoke", () => {
  test("shop, POS reporting, commissions, and normal navigation stay usable", async ({ page }) => {
    dismissDialogs(page);
    await loginAsAdmin(page);

    const fixture = await page.evaluate(async () => {
      const categoriesResponse = await fetch("/api/v1/admin/categories", {
        credentials: "include",
      });
      const categoriesPayload = await categoriesResponse.json();
      const categorySlug = categoriesPayload.data.categories[0]?.slug;
      if (!categorySlug) {
        throw new Error("No category available for live smoke fixture");
      }

      const seed = Date.now();
      const employeeName = `Live QA Employee ${seed}`;
      const productName = `Live QA Product ${seed}`;
      const productSlug = `live-qa-product-${seed}`;
      const barcode = `LIVE-${seed}`;
      const qrCode = `LIVEQR-${seed}`;

      const employeeResponse = await fetch("/api/v1/admin/employees", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          name: employeeName,
          status: "active",
          notes: "Live smoke employee",
        }),
      });
      if (!employeeResponse.ok) {
        throw new Error("Unable to create live smoke employee");
      }
      const employeePayload = await employeeResponse.json();

      const productResponse = await fetch("/api/v1/admin/products", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({
          slug: productSlug,
          name: productName,
          description: "Live smoke verification product",
          categorySlug,
          stockMode: "simple",
          price: 2499,
          stock: 9,
          sizeChart: "apparel",
          sizes: [],
          colors: [],
          tags: ["live", "smoke"],
          featured: false,
          trending: false,
          isActive: true,
          images: [],
          variants: [],
          barcode,
          qrCode,
          supplierBarcode: "",
          commissionRate: 5,
        }),
      });
      if (!productResponse.ok) {
        throw new Error("Unable to create live smoke product");
      }

      return {
        employeeId: employeePayload.data.employee.id as string,
        employeeName,
        productName,
        productSlug,
        barcode,
      };
    });

    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Shop everything." })).toBeVisible();
    await expect(page.getByText(fixture.productName)).toBeVisible();
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Control room." })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Control room." })).toBeVisible();
    await page.goto("/admin/customers");
    await expect(page.getByRole("heading", { name: /Customers \(/ })).toBeVisible();
    await page.goto(`/product/${fixture.productSlug}`);
    await expect(page.getByRole("heading", { name: fixture.productName })).toBeVisible();
    await page.goto("/admin/orders");
    await expect(page.getByRole("heading", { name: /Orders \(/ })).toBeVisible();

    await page.goto("/pos");
    await page.getByPlaceholder("Barcode, QR code, SKU, or product name").fill(fixture.barcode);
    await page.locator("button").filter({ hasText: fixture.productName }).first().click();
    await page.locator("tbody select").first().selectOption({ label: fixture.employeeName });
    await page.getByLabel(/^Customer name$/).fill(`Live smoke ${Date.now()}`);
    await page.getByRole("button", { name: "Finalize bill" }).click();
    await expect(page.getByText(/Receipt /)).toBeVisible();
    const receiptNumber = (await page.getByText(/Receipt /).textContent()) ?? "";
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/pos-sales");
    await expect(page.getByText(/POS sales \(/)).toBeVisible();
    await expect(page.getByText(receiptNumber.replace("Receipt ", "").trim())).toBeVisible();
    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByText(fixture.employeeName)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/commissions");
    await expect(page.getByText(/Commission ledger \(/)).toBeVisible();
    const commissions = await page.evaluate(async () => {
      const response = await fetch("/api/v1/admin/commissions", {
        credentials: "include",
      });
      const payload = await response.json();
      return payload.data.commissions as Array<{ employeeName: string }>;
    });
    expect(commissions.some((entry) => entry.employeeName === fixture.employeeName)).toBeTruthy();
  });
});
