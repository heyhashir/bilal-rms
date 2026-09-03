import { expect, test, type Page } from "@playwright/test";
import type { Product, StorefrontSettings } from "../../src/lib/catalog-types";

const product = (patch: Partial<Product>): Product => ({
  id: "simple", name: "QA Tee", slug: "qa-tee", description: "",
  category: "tees", categoryName: "Tees", price: 500, effectivePrice: 500,
  images: [], sizes: [], colors: [], stock: 0, stockMode: "simple",
  sizeChart: "none", tags: [], createdAt: 1, variants: [], isActive: true,
  barcode: "QA-TEE", qrCode: "QR-QA-TEE", ...patch,
});
const jeans = product({
  id: "jeans", name: "QA Cotton Jeans", slug: "qa-jeans", stock: 4, stockMode: "variant",
  barcode: "QA-JEANS-PARENT", qrCode: "QR-QA-JEANS-PARENT", variants: [
    { id: "black22", sku: "QA-BLACK-22", size: "22", colorName: "Black", colorHex: "#000000", stock: 0, isActive: true, barcode: "QA-BLACK-22", qrCode: "QR-QA-BLACK-22" },
    { id: "blue24", sku: "QA-BLUE-24", size: "24", colorName: "Blue", colorHex: "#0000ff", stock: 4, isActive: true, barcode: "QA-BLUE-24", qrCode: "QR-QA-BLUE-24", supplierBarcode: "SUP-24", priceOverride: 0 },
  ],
});
const settings = { id: "qa-settings", name: "QA Store", currency: "PKR", receiptPrefix: "QA", invoicePrefix: "QA" } as StorefrontSettings;

async function fixtures(page: Page, desktop: boolean) {
  if (desktop) {
    await page.addInitScript(() => {
      const read = (key: string) => JSON.parse(localStorage.getItem(key) ?? "null");
      const write = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));
      window.bilalDesktop = {
        isDesktop: true,
        getDeviceKey: () => "qa-desktop",
        getDesktopContext: () => ({ appVersion: "0.3.3", appName: "QA Desktop", cloudOrigin: location.origin, cloudApiBaseUrl: null }),
        loadPosCache: () => read("bilal_rms_pos_cache"),
        savePosCache: (cache) => write("bilal_rms_pos_cache", cache),
        loadPosSyncState: () => read("bilal_rms_pos_sync_state"),
        savePosSyncState: (state) => write("bilal_rms_pos_sync_state", state),
        patchPosSyncState: (patch) => { const next = { ...read("bilal_rms_pos_sync_state"), ...patch }; write("bilal_rms_pos_sync_state", next); return next; },
        loadQueuedSales: () => read("bilal_rms_pos_queue") ?? [],
        loadQueuedRefunds: () => [],
        listOfflineReceipts: () => [],
        cacheCurrentUser: () => {},
        getCachedCurrentUser: () => null,
        checkForUpdates: async () => ({ deviceKey: "qa-desktop", currentVersion: "0.3.3", latestVersion: "0.3.3", available: false, mandatory: false, notes: "", publishedAt: 1, windows: null }),
      } as typeof window.bilalDesktop;
    });
  }
  const state = { products: [product({}), jeans, product({ id: "archived", name: "QA Archived", isActive: false, stock: 10 })], rejectQueuedSync: false, failBootstrap: false, bootstrapCalls: 0, errors: [] as string[] };
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    let data: unknown;
    if (path === "/sync/register" && request.method() === "POST" && desktop) {
      data = { device: { id: "qa-desktop" } };
    } else if (path === "/admin/pos-sales" && state.rejectQueuedSync && request.postDataJSON().saleNumber === "QA-UNSYNCED") {
      await route.fulfill({ status: 503, json: { success: false, message: "Fixture offline sync unavailable" } });
      return;
    } else if (request.method() !== "GET") {
      throw new Error(`Unexpected business write: ${path}`);
    } else if (path === "/auth/me") {
      data = { user: { id: "qa-admin", name: "QA Admin", email: "qa@example.test", role: "admin", addresses: [], createdAt: 1 } };
    } else if (path === "/sync/bootstrap") {
      state.bootstrapCalls += 1;
      if (state.failBootstrap) {
        await route.fulfill({ status: 503, json: { success: false, message: "Fixture catalog unavailable" } });
        return;
      }
      data = { products: state.products, employees: [], settings, cursor: "1", requestedCursor: null, changed: true };
    } else if (path === "/catalog/settings") {
      data = { settings: null };
    } else if (path === "/catalog/bootstrap" || path === "/categories") {
      data = { products: [], categories: [], settings: null };
    } else {
      throw new Error(`Unexpected request: ${path}`);
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return state;
}

const results = (page: Page) => page.getByLabel("POS product results");
const search = (page: Page) => page.getByLabel("Scan or search", { exact: true });

test("catalog is visible; zero stock is explained and a product name offers variants", async ({ page }, info) => {
  const state = await fixtures(page, info.project.name === "desktop-renderer");
  await page.goto("/pos");
  await expect(results(page).getByText("QA Tee", { exact: true })).toBeVisible();
  await expect(results(page)).not.toContainText("QA Archived");
  await search(page).fill("QA Tee");
  await search(page).press("Enter");
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: "Out of stock: QA Tee" })).toBeVisible();
  await expect(page.locator("tbody")).toContainText("No items added yet.");
  await search(page).fill("QA Cotton Jeans");
  await search(page).press("Enter");
  await expect(results(page).getByRole("button")).toHaveCount(2);
  await expect(page.locator("tbody")).toContainText("No items added yet.");
  await results(page).getByRole("button", { name: /QA-BLUE-24/ }).click();
  await expect(page.locator("tbody tr")).toContainText("QA-BLUE-24");
  await expect(page.locator("tbody tr").getByRole("spinbutton").first()).toHaveValue("1");
  await expect(page.locator("tbody tr")).toContainText("Rs. 0");
  expect(state.errors).toEqual([]);
});

test("parent barcode/QR offers variants; exact barcode, QR and supplier scans add once each", async ({ page }, info) => {
  const state = await fixtures(page, info.project.name === "desktop-renderer");
  await page.goto("/pos");
  await expect(results(page)).toBeVisible();
  for (const code of ["QA-JEANS-PARENT", "QR-QA-JEANS-PARENT"]) {
    await search(page).fill(code);
    await search(page).press("Enter");
    await expect(results(page).getByRole("button")).toHaveCount(2);
    await expect(page.locator("tbody")).toContainText("No items added yet.");
  }
  for (const [index, code] of ["QA-BLUE-24", "QR-QA-BLUE-24", "SUP-24"].entries()) {
    await search(page).fill(code);
    await search(page).press("Enter");
    await expect(page.locator("tbody tr").getByRole("spinbutton").first()).toHaveValue(String(index + 1));
  }
  await search(page).evaluate(element => element.blur());
  await page.keyboard.type("QA-BLUE-24", { delay: 5 });
  await page.keyboard.press("Enter");
  await expect(page.locator("tbody tr").getByRole("spinbutton").first()).toHaveValue("4");
  await search(page).fill("UNKNOWN-CODE");
  await search(page).press("Enter");
  await expect(page.getByText("No matching products. Clear the filters or refresh products.")).toBeVisible();
  await expect(page.locator("tbody tr").getByRole("spinbutton").first()).toHaveValue("4");
  expect(state.errors).toEqual([]);
});

test("refresh and reconnect load newly added products; failed refresh preserves catalog", async ({ page }, info) => {
  const state = await fixtures(page, info.project.name === "desktop-renderer");
  await page.goto("/pos");
  await expect(results(page)).toBeVisible();
  state.products.push(product({ id: "new", name: "QA New Arrival", slug: "qa-new", stock: 2, barcode: "QA-NEW" }));
  await page.getByRole("button", { name: "Refresh products", exact: true }).click();
  await expect(results(page).getByText("QA New Arrival", { exact: true })).toBeVisible();
  state.failBootstrap = true;
  await page.getByRole("button", { name: "Refresh products", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Fixture catalog unavailable");
  await expect(results(page).getByText("QA New Arrival", { exact: true })).toBeVisible();
  state.failBootstrap = false;
  state.products.push(product({ id: "online", name: "QA Reconnected", slug: "qa-online", stock: 1, barcode: "QA-ONLINE" }));
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(results(page).getByText("QA Reconnected", { exact: true })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(state.errors).toEqual([]);
});

test("refresh does not overwrite locally adjusted stock or remove queued bills", async ({ page }, info) => {
  const state = await fixtures(page, info.project.name === "desktop-renderer");
  state.rejectQueuedSync = true;
  await page.addInitScript(({ products, settings }) => {
    localStorage.setItem("bilal_rms_pos_cache", JSON.stringify({ products, settings, employees: [], updatedAt: 1 }));
    localStorage.setItem("bilal_rms_pos_queue", JSON.stringify([{ saleNumber: "QA-UNSYNCED", lines: [] }]));
  }, { products: [product({ stock: 1 })], settings });
  await page.goto("/pos");
  await expect(results(page)).toContainText("1 in stock");
  await page.getByRole("button", { name: "Refresh products", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Local stock has been preserved");
  expect(state.bootstrapCalls).toBe(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("bilal_rms_pos_queue")!))).toEqual([{ saleNumber: "QA-UNSYNCED", lines: [] }]);
  expect(state.errors).toEqual([]);
});
