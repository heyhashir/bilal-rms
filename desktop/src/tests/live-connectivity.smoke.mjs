import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";
import dotenv from "dotenv";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rootDir = path.resolve(desktopDir, "..");
const packagedExecutable = process.env.BILAL_RMS_DESKTOP_EXECUTABLE?.trim();
const remoteUrl = process.env.BILAL_RMS_REMOTE_URL?.trim() || "http://127.0.0.1:5000";
const qaPrefix = process.env.QA_RUN_PREFIX?.trim() || `qa-desktop-${Date.now().toString(36)}`;
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), `${qaPrefix}-`));
const electronExecutable =
  packagedExecutable ||
  path.join(
    desktopDir,
    "node_modules",
    "electron",
    "dist",
    process.platform === "win32" ? "electron.exe" : "electron",
  );

assert.ok(fs.existsSync(path.join(rootDir, "backend", "public", "index.html")), "Run npm run build before this test");
assert.ok(fs.existsSync(electronExecutable), packagedExecutable ? "Packaged desktop executable was not found" : "Run npm run desktop:install before this test");

const startupStartedAt = performance.now();
const app = await electron.launch({
  executablePath: electronExecutable,
  args: [...(packagedExecutable ? [] : [desktopDir]), `--user-data-dir=${userDataDir}`],
  cwd: rootDir,
  env: {
    ...process.env,
    BILAL_RMS_REMOTE_URL: remoteUrl,
  },
});

let passed = false;
try {
  const window = await app.firstWindow();
  await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/login$/);
  const startupMs = performance.now() - startupStartedAt;
  assert.ok(startupMs < 4_000, `Electron usable sign-in state exceeded 4 seconds (${startupMs.toFixed(1)} ms)`);

  const context = await window.evaluate(() => window.bilalDesktop.getDesktopContext());
  assert.match(context.cloudApiBaseUrl, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(context.cloudOrigin, new URL(remoteUrl).origin);
  const expectedCurrentVersion = process.env.BILAL_RMS_EXPECTED_CURRENT_VERSION?.trim();
  if (expectedCurrentVersion) {
    assert.equal(context.appVersion, expectedCurrentVersion);
  }

  const health = await window.evaluate(async () => {
    const response = await fetch("/api/v1/health");
    return { status: response.status, body: await response.json() };
  });
  assert.equal(health.status, 200);
  assert.equal(health.body.success, true);

  const categories = await window.evaluate(async () => {
    const response = await fetch("/api/v1/categories");
    return { status: response.status, body: await response.json() };
  });
  assert.equal(categories.status, 200);
  assert.equal(categories.body.success, true);

  const registration = await window.evaluate(async (prefix) => {
    const context = window.bilalDesktop.getDesktopContext();
    const response = await fetch("/api/v1/sync/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        deviceKey: window.bilalDesktop.getDeviceKey(),
        name: context.appName,
        notes: `${prefix} connectivity smoke ${context.appVersion}`,
      }),
    });
    return { status: response.status, body: await response.json() };
  }, qaPrefix);
  assert.equal(registration.status, 201);
  assert.equal(registration.body.success, true);

  const bootstrap = await window.evaluate(async () => {
    const deviceKey = window.bilalDesktop.getDeviceKey();
    const response = await fetch(`/api/v1/sync/bootstrap?deviceKey=${encodeURIComponent(deviceKey)}`);
    return { status: response.status, body: await response.json() };
  });
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.success, true);
  assert.ok(Array.isArray(bootstrap.body.data.products));
  assert.ok(Array.isArray(bootstrap.body.data.employees));

  const adminEnvPath = process.env.BILAL_RMS_ADMIN_ENV?.trim();
  if (adminEnvPath) {
    const resolvedAdminEnvPath = path.isAbsolute(adminEnvPath) ? adminEnvPath : path.resolve(rootDir, adminEnvPath);
    const adminEnv = dotenv.parse(fs.readFileSync(resolvedAdminEnvPath));
    assert.ok(adminEnv.ADMIN_EMAIL && adminEnv.ADMIN_PASSWORD, "Admin credential file is incomplete");

    await window.getByLabel("Email").fill(adminEnv.ADMIN_EMAIL);
    await window.getByLabel("Password").fill(adminEnv.ADMIN_PASSWORD);
    const signInStartedAt = performance.now();
    await window.getByRole("button", { name: "Sign in" }).click();
    await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/admin$/);
    const signInMs = performance.now() - signInStartedAt;
    const authenticatedSession = await window.evaluate(async () => {
      const response = await fetch("/api/v1/auth/me");
      return await response.json();
    });
    assert.equal(authenticatedSession.data?.user?.role, "admin");
    await window.goto(new URL("/category/kids", window.url()).toString());
    await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/category\/kids$/);
    const desktopBackButton = window.getByRole("button", { name: "Back to previous screen" });
    await desktopBackButton.waitFor();
    await desktopBackButton.click();
    await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/admin$/);
    const posStartedAt = performance.now();
    await window.goto(new URL("/pos", window.url()).toString());
    await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/pos$/);
    const reloadedSession = await window.evaluate(async () => {
      const response = await fetch("/api/v1/auth/me");
      return await response.json();
    });
    assert.equal(reloadedSession.data?.user?.role, "admin");
    await window.getByText("Desktop updates", { exact: true }).waitFor({ timeout: 15_000 });
    const posUsableMs = performance.now() - posStartedAt;
    assert.ok(posUsableMs < 4_000, `Electron POS usable state exceeded 4 seconds (${posUsableMs.toFixed(1)} ms)`);
    const posBody = await window.locator("body").innerText();
    assert.match(posBody, /desktop updates/i, `Desktop update section did not render. POS body: ${posBody.slice(0, 500)}`);
    await window.getByRole("button", { name: "Check now" }).click();
    await window.getByRole("button", { name: "Check now" }).waitFor();
    const expectedLatestVersion = process.env.BILAL_RMS_EXPECTED_LATEST_VERSION?.trim() || context.appVersion;
    await window.waitForFunction(
      (version) => document.body.innerText.includes(`Latest version: ${version}`),
      expectedLatestVersion,
    );
    const expectedUpdateAvailable = process.env.BILAL_RMS_EXPECTED_UPDATE_AVAILABLE?.trim();
    if (expectedUpdateAvailable === "true" || (!expectedUpdateAvailable && expectedLatestVersion !== context.appVersion)) {
      try {
        await window
          .getByRole("button", { name: `Install ${expectedLatestVersion}` })
          .waitFor({ timeout: 15_000 });
      } catch (error) {
        const diagnostics = await window.evaluate(() => ({
          text: document.body.innerText,
          buttons: Array.from(document.querySelectorAll("button")).map((button) => button.innerText),
        }));
        console.error("Desktop update diagnostics:", JSON.stringify(diagnostics, null, 2));
        throw error;
      }
    } else if (expectedUpdateAvailable === "false") {
      assert.equal(
        await window.getByRole("button", { name: `Install ${expectedLatestVersion}` }).count(),
        0,
      );
    }

    await window.waitForFunction(
      ({ productCount, cursor }) => {
        const cache = window.bilalDesktop.loadPosCache();
        const syncState = window.bilalDesktop.loadPosSyncState();
        return cache?.products.length === productCount && syncState?.lastCursor === cursor;
      },
      {
        productCount: bootstrap.body.data.products.length,
        cursor: bootstrap.body.data.cursor,
      },
    );

    const localProjection = await window.evaluate(() => ({
      products: window.bilalDesktop.loadPosCache()?.products.length ?? null,
      cursor: window.bilalDesktop.loadPosSyncState()?.lastCursor ?? null,
    }));
    assert.equal(localProjection.products, bootstrap.body.data.products.length);
    assert.equal(localProjection.cursor, bootstrap.body.data.cursor);

    await window.evaluate(async () => {
      await fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
    });
    console.log(
      `Desktop authenticated live sync smoke passed (startup ${startupMs.toFixed(1)} ms, sign-in ${signInMs.toFixed(1)} ms, POS ${posUsableMs.toFixed(1)} ms)`,
    );
  }

  console.log("Desktop live connectivity smoke passed");
  passed = true;
} finally {
  const appProcess = app.process();
  await Promise.race([
    app.close(),
    new Promise((resolve) => {
      const timer = setTimeout(resolve, 5_000);
      timer.unref();
    }),
  ]);
  if (!appProcess.killed) {
    appProcess.kill();
  }
  fs.rmSync(userDataDir, { recursive: true, force: true });
}

if (!passed) {
  process.exitCode = 1;
}
