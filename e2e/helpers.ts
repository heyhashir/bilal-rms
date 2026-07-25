import path from "path";
import { expect, type Page } from "@playwright/test";

export const adminCredentials = {
  email: "admin@bilalgarments.pk",
  password: "admin123",
};

const qaPrefix = process.env.QA_RUN_PREFIX?.trim() || "Playwright";
const qaCode = qaPrefix.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 18) || "PW";

export const testData = {
  categoryName: `${qaPrefix} Category`,
  brandName: `${qaPrefix} Brand`,
  brandSlug: `${qaPrefix.toLowerCase()}-brand`.replace(/[^a-z0-9-]/g, "-"),
  employeeName: `${qaPrefix} Employee`,
  productName: `${qaPrefix} Kurta`,
  productSlug: `${qaPrefix.toLowerCase()}-kurta`.replace(/[^a-z0-9-]/g, "-"),
  productBarcode: `${qaCode}-KURTA-001`,
  productQrCode: `${qaCode}-QR-001`,
  customerName: `${qaPrefix} Walk-in Customer`,
  onlineCustomerName: `${qaPrefix} Website Customer`,
  onlineCustomerEmail: `${qaPrefix.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
};

export const productImagePath = path.resolve(process.cwd(), "src", "assets", "p-tee.jpg");

export const dismissDialogs = (page: Page) => {
  page.on("dialog", (dialog) => dialog.accept());
};

export const loginAsAdmin = async (page: Page) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(adminCredentials.email);
  await page.getByLabel("Password").fill(adminCredentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Control room." })).toBeVisible();
};

export const saveModal = async (page: Page) => {
  await page.getByRole("button", { name: "Save" }).click();
};
