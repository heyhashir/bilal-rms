import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rootDir = path.resolve(desktopDir, "..");
const packagedExecutable = process.env.BILAL_RMS_DESKTOP_EXECUTABLE?.trim();
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

const app = await electron.launch({
  executablePath: electronExecutable,
  args: packagedExecutable ? [] : [desktopDir],
  cwd: rootDir,
  env: {
    ...process.env,
    BILAL_RMS_REMOTE_URL: "https://balybybilalgarments.com",
  },
});

let passed = false;
try {
  const window = await app.firstWindow();
  await window.waitForURL(/^http:\/\/127\.0\.0\.1:\d+\/login$/);

  const context = await window.evaluate(() => window.bilalDesktop.getDesktopContext());
  assert.match(context.cloudApiBaseUrl, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(context.cloudOrigin, "https://balybybilalgarments.com");

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

  const bootstrap = await window.evaluate(async () => {
    const deviceKey = window.bilalDesktop.getDeviceKey();
    const response = await fetch(`/api/v1/sync/bootstrap?deviceKey=${encodeURIComponent(deviceKey)}`);
    return { status: response.status, body: await response.json() };
  });
  assert.equal(bootstrap.status, 200);
  assert.equal(bootstrap.body.success, true);
  assert.ok(Array.isArray(bootstrap.body.data.products));
  assert.ok(Array.isArray(bootstrap.body.data.employees));

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
}

if (!passed) {
  process.exitCode = 1;
}
