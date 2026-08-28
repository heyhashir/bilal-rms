import { expect, test } from "@playwright/test";

test.describe("Bilal RMS read-only environment smoke", () => {
  test("public storefront and health endpoints load without mutating business data", async ({ page, request }) => {
    const mutatingRequests: string[] = [];
    page.on("request", (entry) => {
      if (!["GET", "HEAD", "OPTIONS"].includes(entry.method())) {
        mutatingRequests.push(`${entry.method()} ${entry.url()}`);
      }
    });

    const health = await request.get("/api/v1/health");
    expect(health.ok()).toBeTruthy();
    const ready = await request.get("/api/v1/health/ready");
    expect(ready.ok()).toBeTruthy();

    await page.goto("/");
    await expect(page.locator("body")).toContainText(/BALY|Bilal Garments/i);
    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "Shop everything." })).toBeVisible();
    await page.goto("/search?q=readonly-smoke-no-match");
    await expect(page.locator("body")).toContainText(/search|no matches|no products/i);
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();

    expect(mutatingRequests).toEqual([]);
  });
});
