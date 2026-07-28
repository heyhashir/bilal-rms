import { expect, test } from "@playwright/test";
import { dismissDialogs, loginAsAdmin } from "../helpers";

test.describe("Bilal RMS live-safe smoke", () => {
  test("shop, POS reporting, commissions, and normal navigation stay usable", async ({ page }) => {
    dismissDialogs(page);
    await loginAsAdmin(page);
    const qaPrefix = process.env.QA_RUN_PREFIX?.trim() || `qa-live-${Date.now()}`;

    const fixture = await page.evaluate(async (prefix) => {
      const categoriesResponse = await fetch("/api/v1/admin/categories", {
        credentials: "include",
      });
      const categoriesPayload = await categoriesResponse.json();
      const categorySlug = categoriesPayload.data.categories[0]?.slug;
      if (!categorySlug) {
        throw new Error("No category available for live smoke fixture");
      }

      const employeeName = `${prefix} Employee`;
      const productName = `${prefix} Product`;
      const productSlug = `${prefix}-product`;
      const barcode = `${prefix}-barcode`;
      const qrCode = `${prefix}-qr`;

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
          commissionRate: 5,
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
    }, qaPrefix);

    await page.goto("/admin/products");
    const productRow = page.locator("tr").filter({ hasText: fixture.productName });
    await productRow.getByTitle("Print barcode stickers").click();
    await expect(page.getByRole("heading", { name: `Barcode stickers - ${fixture.productName}` })).toBeVisible();
    await expect(page.getByText("Labels print at 1.50 x 1.00 inches in landscape.")).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByRole("button", { name: "Add product" }).click();
    await page.getByLabel("Stock mode").selectOption("variant");
    await page.getByLabel("Sizes (comma separated)").fill("S, M");
    const colorInput = page.getByPlaceholder("Color name");
    await colorInput.fill("Black");
    await colorInput.locator("..").getByRole("button", { name: "Add" }).click();
    await page.getByRole("button", { name: "Generate matrix" }).click();
    await expect(page.getByLabel("S Black stock")).toBeEnabled();
    await expect(page.getByLabel("M Black stock")).toBeEnabled();
    await page.getByRole("button", { name: "Cancel" }).click();

    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Shop everything." })).toBeVisible();
    await expect(page.getByRole("link", { name: fixture.productName }).first()).toBeVisible();
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
    await page.getByLabel(/^Customer name$/).fill(`${qaPrefix} Customer`);
    const createSaleResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/api/v1/admin/pos-sales") &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );
    await page.getByRole("button", { name: "Finalize bill" }).click();
    const createdSalePayload = await (await createSaleResponse).json();
    await expect(page.getByRole("button", { name: "Close" })).toBeVisible();
    const saleNumber = createdSalePayload?.data?.sale?.saleNumber ?? "";
    const receiptNumber = createdSalePayload?.data?.sale?.receipt?.receiptNumber ?? "";
    const invoiceNumber = createdSalePayload?.data?.sale?.receipt?.invoiceNumber ?? "";
    expect(invoiceNumber).toMatch(/^[A-Z]+[0-9]{6}$/);
    await expect(page.locator(".pos-receipt")).toBeVisible();
    await expect(page.locator(".pos-receipt").getByText("Retail", { exact: true })).toBeVisible();
    await expect(page.locator(".pos-receipt").getByText("Charged", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.goto("/admin/pos-sales");
    await expect(page.getByText(/POS sales \(/)).toBeVisible();
    await expect(page.getByText(receiptNumber.replace("Receipt ", "").trim())).toBeVisible();
    await page.getByRole("button", { name: "View" }).first().click();
    await expect(page.getByText(fixture.employeeName, { exact: true })).toBeVisible();
    await page.evaluate(() => {
      const testWindow = window as Window & { __printCalled?: boolean };
      testWindow.__printCalled = false;
      window.print = () => {
        testWindow.__printCalled = true;
      };
    });
    const reprintResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/admin/pos-sales/${saleNumber}/reprint`) &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: "Print" }).click();
    await reprintResponse;
    expect(await page.evaluate(() => (window as Window & { __printCalled?: boolean }).__printCalled)).toBe(true);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download PDF" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`receipt-${invoiceNumber}.pdf`);
    const pdfStream = await download.createReadStream();
    const pdfChunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      pdfChunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    expect(Buffer.concat(pdfChunks).subarray(0, 4).toString()).toBe("%PDF");
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

    await page.goto("/admin/pos-sales");
    const invoiceLookup = page.getByPlaceholder("Exact invoice number, receipt ID, or scanner input");
    await invoiceLookup.fill(invoiceNumber);
    await invoiceLookup.press("Enter");
    await expect(page.getByRole("heading", { name: `POS sale ${saleNumber}` })).toBeVisible();
    await page.getByLabel("Administrator cancellation reason").fill("Live-safe smoke correction");
    const voidResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/v1/admin/pos-sales/${saleNumber}/void`) &&
        response.request().method() === "POST" &&
        response.status() === 200,
    );
    await page.getByRole("button", { name: "Void invoice" }).click();
    await voidResponse;
    await expect(page.getByText(/Voided by .*Live-safe smoke correction/)).toBeVisible();

    const reversalExists = await page.evaluate(async ({ employeeName, targetSale }) => {
      const response = await fetch("/api/v1/admin/commissions", { credentials: "include" });
      const payload = await response.json();
      return payload.data.commissions.some(
        (entry: { employeeName: string; saleNumber: string; status: string; amount: number }) =>
          entry.employeeName === employeeName &&
          entry.saleNumber === targetSale &&
          entry.status === "reversed" &&
          Number(entry.amount) < 0,
      );
    }, { employeeName: fixture.employeeName, targetSale: saleNumber });
    expect(reversalExists).toBeTruthy();
  });
});
