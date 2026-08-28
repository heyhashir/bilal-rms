import { chromium } from "playwright";

const baseUrl = process.env.QA_BASE_URL?.trim() || "http://127.0.0.1:5000";
const apiBudgetMs = 750;
const pageBudgetMs = 3_000;
const uiFeedbackBudgetMs = 250;
const endpoints = [
  "/api/v1/health",
  "/api/v1/categories",
  "/api/v1/catalog/settings",
  "/api/v1/catalog/bootstrap",
  "/api/v1/catalog/products?sort=newest&inStock=true",
];

const apiResults = {};
for (const endpoint of endpoints) {
  const samples = [];
  for (let index = 0; index < 20; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}${endpoint}`);
    if (!response.ok) {
      throw new Error(`${endpoint} returned HTTP ${response.status}`);
    }
    await response.arrayBuffer();
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  apiResults[endpoint] = {
    p95Ms: Number(samples[Math.ceil(samples.length * 0.95) - 1].toFixed(1)),
    maxMs: Number(samples.at(-1).toFixed(1)),
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const pageResults = [];
const uiFeedbackResults = [];
try {
  for (const route of ["/", "/shop", "/search?q=performance"]) {
    const startedAt = performance.now();
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.locator("main").first().waitFor();
    pageResults.push({ route, usableMs: Number((performance.now() - startedAt).toFixed(1)) });
  }

  await page.goto(`${baseUrl}/shop`, { waitUntil: "domcontentloaded" });
  const listViewButton = page.getByRole("button", { name: "List" });
  const feedbackStartedAt = performance.now();
  await listViewButton.click();
  await page.waitForFunction(() => document.querySelector('[aria-label="List"]')?.classList.contains("bg-primary"));
  uiFeedbackResults.push({ action: "shop list-view toggle", feedbackMs: Number((performance.now() - feedbackStartedAt).toFixed(1)) });
} finally {
  await browser.close();
}

console.log(JSON.stringify({ apiResults, pageResults, uiFeedbackResults }, null, 2));

const slowApi = Object.entries(apiResults).find(([, result]) => result.p95Ms >= apiBudgetMs);
if (slowApi) {
  throw new Error(`${slowApi[0]} p95 exceeded ${apiBudgetMs} ms`);
}
const slowPage = pageResults.find((result) => result.usableMs >= pageBudgetMs);
if (slowPage) {
  throw new Error(`${slowPage.route} usable state exceeded ${pageBudgetMs} ms`);
}
const slowFeedback = uiFeedbackResults.find((result) => result.feedbackMs >= uiFeedbackBudgetMs);
if (slowFeedback) {
  throw new Error(`${slowFeedback.action} feedback exceeded ${uiFeedbackBudgetMs} ms`);
}
