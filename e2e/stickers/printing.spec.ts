import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs/promises";
import { startPrintService } from "../../desktop/src/print-service.mjs";

async function fixtures(page: Page, code: string) {
  const state = {
    code,
    saves: [] as Record<string, unknown>[],
    errors: [] as string[],
  };
  const product = () => ({
    id: "qa-product", name: "QA Cotton Jeans", slug: "qa-cotton-jeans", description: "QA fixture",
    category: "jeans", categoryName: "Jeans", images: [], price: 2495, effectivePrice: 2495,
    stock: 1, stockMode: "variant", isActive: true, sizes: ["26"], colors: [{ name: "Beige", hex: "#d9c8a8" }],
    sizeChart: "bottoms", tags: [], createdAt: 1,
    variants: [{ id: "qa-variant", sku: "COTTONJEAN-BEI-26", size: "26", colorName: "Beige", colorHex: "#d9c8a8", stock: 1, isActive: true, barcode: state.code, qrCode: "QA-QR", priceOverride: null }],
  });
  page.on("pageerror", (error) => state.errors.push(error.message));
  await page.context().addInitScript(() => { window.print = () => {}; });
  await page.route("**/api/v1/**", async route => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/api/v1", "");
    let data: unknown;
    if (path === "/admin/barcodes/labels" && request.method() === "POST") {
      data = { labels: [{ productId: "qa-product", variantId: "qa-variant", name: "QA Cotton Jeans", sku: "COTTONJEAN-BEI-26", size: "26", color: "Beige", price: 2495, stock: 1, barcode: state.code, qrCode: "QA-QR", labelTemplate: "compact" }] };
    } else if (path === "/admin/products/qa-product" && request.method() === "PUT") {
      const body = request.postDataJSON();
      state.saves.push(body);
      state.code = body.variants[0].barcode;
      data = { product: product() };
    } else if (request.method() !== "GET") {
      throw new Error(`Unexpected write ${path}`);
    } else if (path === "/auth/me") {
      data = { user: { id: "qa-admin", email: "qa@example.test", name: "QA Admin", role: "admin", addresses: [], createdAt: 1 } };
    } else if (path === "/admin/products") {
      data = { products: [product()] };
    } else if (path === "/admin/categories" || path === "/categories") {
      data = { categories: [{ id: "jeans", slug: "jeans", name: "Jeans", children: [] }] };
    } else if (path === "/admin/brands") {
      data = { brands: [] };
    } else if (path === "/catalog/settings") {
      data = { settings: null };
    } else if (path === "/catalog/bootstrap") {
      data = { products: [], categories: [], settings: null };
    } else {
      throw new Error(`Unexpected read ${path}`);
    }
    await route.fulfill({ json: { success: true, data } });
  });
  return state;
}

test("paired website prints directly, reloads calibration and retains separate profiles", async ({ page }) => {
  await fixtures(page, "BA-1234");
  let profiles = {
    receipt: null,
    sticker: { printerName: "QA Labels", widthMm: 38, heightMm: 25, orientation: 0, offsetXmm: 0, offsetYmm: 0, gapMm: 2, copies: 1, design: "standard" },
  };
  const jobs: Array<{ kind: string; payload: { html: string; widthMm: number; heightMm: number } }> = [];
  const helper = await startPrintService({ token: "qa-pairing-code", origins: ["http://127.0.0.1:5012", "https://balybybilalgarments.com"],
    listPrinters: async () => [{ name: "QA Labels", displayName: "QA Labels", isDefault: false }],
    getProfiles: () => profiles, saveProfiles: (next: typeof profiles) => (profiles = next),
    print: async (kind: string, payload: typeof jobs[number]["payload"]) => { jobs.push({ kind, payload }); return { ok: true }; } });
  try {
    await page.goto("/admin/products");
    await page.getByTitle("Print barcode stickers").click();
    await page.getByRole("button", { name: "Print 1 sticker", exact: true }).click();
    await page.getByLabel("Desktop pairing code").fill("qa-pairing-code");
    await page.getByRole("button", { name: "Connect desktop printer helper" }).click();
    await page.getByRole("button", { name: "Save presets" }).click();
    await expect(page.getByText("Printer presets saved on this PC")).toBeVisible();
    await page.getByRole("button", { name: "Print 1 sticker", exact: true }).click();
    await expect.poll(() => jobs.length).toBe(1);
    expect(page.context().pages()).toHaveLength(1);
    expect(jobs[0].payload.widthMm).toBe(38);
    await page.getByRole("button", { name: "Change printer preset" }).click();
    await page.getByLabel("Width (mm)", { exact: true }).fill("50");
    await page.getByRole("button", { name: "Save presets" }).click();
    await expect(page.getByText(/Live Sticker Preview \(50mm/)).toBeVisible();
    await page.getByRole("button", { name: "Print 1 sticker", exact: true }).click();
    await expect.poll(() => jobs.length).toBe(2);
    expect(jobs[1].payload.widthMm).toBe(50);
    expect(profiles.receipt).toBeNull();
    await fs.mkdir("test-results/printing", { recursive: true });
    await fs.writeFile("test-results/printing/sticker.html", jobs[1].payload.html);
    // Exercise HTTPS -> loopback under production CSP without touching the live site.
    await page.route("https://balybybilalgarments.com/qa-print-bridge", route => route.fulfill({
      contentType: "text/html", body: "<!doctype html><title>Local print bridge fixture</title>",
      headers: { "Content-Security-Policy": "default-src 'self'; connect-src 'self' http://127.0.0.1:17841; upgrade-insecure-requests" },
    }));
    await page.context().grantPermissions(["local-network-access"], { origin: "https://balybybilalgarments.com" });
    await page.goto("https://balybybilalgarments.com/qa-print-bridge");
    const secureProfiles = await page.evaluate(async () => (await fetch("http://127.0.0.1:17841/profiles", { headers: { Authorization: "Bearer qa-pairing-code" } })).json());
    expect(secureProfiles.sticker.widthMm).toBe(50);
  } finally { await new Promise<void>(resolve => helper.close(resolve)); }
});

test("short barcode print output keeps physical size, quiet zones and all template layouts", async ({ page }, info) => {
  const state = await fixtures(page, "BA-1234");
  await page.goto("/admin/products");
  await page.getByTitle("Print barcode stickers").click();
  for (const template of ["standard", "compact", "branded"]) {
    await page.getByLabel("Sticker Design").selectOption(template);
    await expect(page.getByRole("button", { name: "Print 1 sticker", exact: true })).toBeEnabled();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Browser print dialog", exact: true }).click();
    const popup = await popupPromise;
    const label = popup.locator(".barcode-sticker-sheet");
    await expect(label).toHaveCount(1);
    const dimensions = await label.evaluate(element => {
      const svg = element.querySelector("svg")!;
      const box = svg.getBoundingClientRect();
      const article = element.querySelector("article")!.getBoundingClientRect();
      const rects = Array.from(svg.querySelectorAll("rect")).slice(1);
      const x = Number(rects[0].getAttribute("x"));
      const last = rects.at(-1)!;
      return { width: box.width, height: box.height, leftQuiet: x, rightQuiet: svg.viewBox.baseVal.width - Number(last.getAttribute("x")) - Number(last.getAttribute("width")), fits: box.left >= article.left && box.right <= article.right && box.bottom <= article.bottom, font: getComputedStyle(element.querySelector("article")!).fontFamily, canvases: element.querySelectorAll("canvas,img").length };
    });
    expect(dimensions.width).toBeCloseTo(30.25 * 96 / 25.4, 1);
    expect(dimensions.height).toBeCloseTo(8 * 96 / 25.4, 1);
    expect(dimensions.leftQuiet).toBe(10);
    expect(dimensions.rightQuiet).toBe(10);
    expect(dimensions.fits).toBe(true);
    expect(dimensions.canvases).toBe(0);
    expect(dimensions.font).toContain("Arial");
    if (template === "standard") await label.screenshot({ path: info.outputPath("short-barcode-preview.png") });
    await popup.close();
  }
  expect(state.saves).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("long SKU barcode is blocked on small stock and never silently replaced or squeezed", async ({ page }) => {
  const state = await fixtures(page, "COTTONJEAN-BEI-26");
  await page.goto("/admin/products");
  await page.getByTitle("Print barcode stickers").click();
  await expect(page.getByRole("alert")).toContainText("63 mm");
  await expect(page.getByRole("button", { name: "Print 1 sticker", exact: true })).toBeDisabled();
  await page.getByLabel("Label Roll Size").selectOption("custom");
  await page.getByLabel("Width (mm)").fill("64");
  await expect(page.getByRole("button", { name: "Print 1 sticker", exact: true })).toBeEnabled();
  expect(state.code).toBe("COTTONJEAN-BEI-26");
  expect(state.saves).toEqual([]);
  expect(state.errors).toEqual([]);
});

test("short code replacement requires confirmation and Save and preserves SKU, stock and QR", async ({ page }) => {
  const state = await fixtures(page, "COTTONJEAN-BEI-26");
  await page.goto("/admin/products");
  await page.getByTitle("Print barcode stickers").click();
  await expect(page.getByRole("alert")).toContainText("63 mm");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Edit QA Cotton Jeans", exact: true }).click();
  const generate = page.getByRole("button", { name: "Generate short variant barcodes", exact: true });
  page.once("dialog", dialog => dialog.dismiss());
  await generate.click();
  await expect(page.getByLabel("26 Beige barcode", { exact: true })).toHaveValue("COTTONJEAN-BEI-26");
  page.once("dialog", dialog => dialog.accept());
  await generate.click();
  await expect(page.getByLabel("26 Beige barcode", { exact: true })).toHaveValue(/^[A-Z]{2}-\d{4}$/);
  expect(state.saves).toEqual([]);
  await expect(page.getByLabel("26 Beige SKU")).toHaveValue("COTTONJEAN-BEI-26");
  await expect(page.getByLabel("26 Beige stock")).toHaveValue("1");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(1);
  expect((state.saves[0].variants as { barcode: string; qrCode: string; stock: number }[])[0]).toMatchObject({ barcode: state.code, qrCode: "QA-QR", stock: 1 });
  await expect(page.getByRole("button", { name: "Print 1 sticker", exact: true })).toBeEnabled();
  await expect(page.getByRole("img", { name: `Barcode ${state.code}`, exact: true })).toBeVisible();
  expect(state.errors).toEqual([]);
});
