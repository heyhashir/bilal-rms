import { expect, test } from "@playwright/test";

test.describe("Bilal RMS quality smoke", () => {
  test("storefront remains usable at target viewports", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    for (const viewport of [
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      const response = await page.goto("/shop", { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Shop everything." })).toBeVisible();
      const layout = await page.evaluate(() => ({
        overflowX: getComputedStyle(document.body).overflowX,
      }));
      expect(["clip", "hidden"]).toContain(layout.overflowX);
    }

    expect(consoleErrors).toEqual([]);
  });

  test("protected admin API and security headers are enforced", async ({ request }) => {
    const response = await request.get("/api/v1/admin/dashboard");
    expect(response.status()).toBe(401);
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  });
});
