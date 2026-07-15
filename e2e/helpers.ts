import path from "path";
import { expect, type Page } from "@playwright/test";

export const adminCredentials = {
  email: "admin@bilalgarments.pk",
  password: "admin123",
};

export const testData = {
  categoryName: "Playwright Category",
  brandName: "Playwright Brand",
  brandSlug: "playwright-brand",
  employeeName: "Ali Sales",
  productName: "Playwright Kurta",
  productSlug: "playwright-kurta",
  productBarcode: "PW-KURTA-001",
  productQrCode: "PWQR-KURTA-001",
  customerName: "Walk In Customer",
  onlineCustomerName: "Website Customer",
  onlineCustomerEmail: "customer@example.com",
};

export const productImagePath = path.resolve(process.cwd(), "e2e", "fixtures", "product-image.svg");

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
