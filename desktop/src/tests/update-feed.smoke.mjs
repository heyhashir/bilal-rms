import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const rootDir = path.resolve(desktopDir, "..");
const desktopPackage = JSON.parse(await fs.readFile(path.join(desktopDir, "package.json"), "utf8"));
const nextVersion = desktopPackage.version;
const versionParts = nextVersion.split(".").map(Number);
assert.equal(versionParts.length, 3, "desktop package version must use semantic versioning");
assert.ok(versionParts.every(Number.isInteger), "desktop package version must contain numeric parts");
assert.ok(versionParts[2] > 0, "desktop update smoke requires a version with a previous patch release");
const currentVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] - 1}`;
const newerVersion = `${versionParts[0]}.${versionParts[1]}.${versionParts[2] + 1}`;
const releaseRoot = await fs.mkdtemp(path.join(os.tmpdir(), "bilal-rms-update-feed-"));
const windowsDir = path.join(releaseRoot, "windows");
const installerFile = `BilalRMS-Setup-${nextVersion}.exe`;
const installerPayload = Buffer.from("MZ-local-update-feed-fixture");
const sha256 = crypto.createHash("sha256").update(installerPayload).digest("hex");

try {
  await fs.mkdir(windowsDir, { recursive: true });
  await fs.writeFile(path.join(windowsDir, installerFile), installerPayload);
  await fs.writeFile(
    path.join(windowsDir, "latest.json"),
    JSON.stringify({
      version: nextVersion,
      installerFile,
      sha256,
      size: installerPayload.length,
      notes: "Local N+1 update feed QA",
      publishedAt: new Date().toISOString(),
    }),
  );

  process.env.APP_URL = "http://127.0.0.1:5000";
  process.env.DESKTOP_APP_VERSION = nextVersion;
  process.env.DESKTOP_RELEASE_DIR = releaseRoot;

  const serviceModuleUrl = pathToFileURL(path.join(rootDir, "backend", "dist", "services", "sync.service.js"));
  const { syncService } = await import(`${serviceModuleUrl.href}?qa=${Date.now()}`);

  const update = await syncService.getUpdateManifest("", currentVersion);
  assert.equal(update.latestVersion, nextVersion);
  assert.equal(update.available, true, "N+1 release must be offered to version N");
  assert.equal(update.windows?.sha256, sha256);
  assert.equal(update.windows?.size, installerPayload.length);
  assert.match(update.windows?.installerUrl ?? "", new RegExp(`${installerFile}$`));

  const current = await syncService.getUpdateManifest("", nextVersion);
  assert.equal(current.available, false, "current version must not be offered as an update");

  const newer = await syncService.getUpdateManifest("", newerVersion);
  assert.equal(newer.available, false, "the update feed must never advertise a downgrade");

  console.log("Desktop local N/N+1 update-feed smoke passed");
} finally {
  await fs.rm(releaseRoot, { recursive: true, force: true });
}
