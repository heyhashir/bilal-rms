import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import dotenv from "dotenv";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || !value) {
    console.error(
      "Usage: node scripts/publish-desktop-release-remote.mjs --base-url <url> --env-file <path> [--notes <text>]",
    );
    process.exit(1);
  }
  args.set(key.slice(2), value);
}

const rootDir = path.resolve(import.meta.dirname, "..");
const packagePath = path.join(rootDir, "desktop", "package.json");
const desktopPackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));
const version = desktopPackage.version;
const installerPath = path.join(rootDir, "desktop", "dist", `BilalRMS-Setup-${version}.exe`);
const baseUrl = (args.get("base-url") || process.env.BILAL_RMS_RELEASE_BASE_URL || "").replace(/\/+$/, "");
const envFile = args.get("env-file") || process.env.BILAL_RMS_ADMIN_ENV || "";
const notes = args.get("notes") || `Bilal RMS desktop ${version}`;

if (!baseUrl || !envFile) {
  throw new Error("Both --base-url and --env-file are required");
}
if (!fs.existsSync(installerPath)) {
  throw new Error(`Desktop installer not found: ${installerPath}`);
}
if (!fs.existsSync(envFile)) {
  throw new Error(`Admin credential file not found: ${envFile}`);
}

const credentials = dotenv.parse(fs.readFileSync(envFile));
if (!credentials.ADMIN_EMAIL || !credentials.ADMIN_PASSWORD) {
  throw new Error("Credential file must contain ADMIN_EMAIL and ADMIN_PASSWORD");
}

const loginResponse = await fetch(`${baseUrl}/api/v1/auth/login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  body: JSON.stringify({
    email: credentials.ADMIN_EMAIL,
    password: credentials.ADMIN_PASSWORD,
  }),
});
const loginBody = await loginResponse.json().catch(() => null);
if (!loginResponse.ok || !loginBody?.success) {
  throw new Error(loginBody?.message || `Admin login failed (${loginResponse.status})`);
}

const cookie = loginResponse.headers.get("set-cookie")?.split(";", 1)[0];
if (!cookie) {
  throw new Error("Admin login did not return a session cookie");
}

const installer = fs.readFileSync(installerPath);
const sha256 = createHash("sha256").update(installer).digest("hex");
const chunkSize = 4 * 1024 * 1024;
const totalChunks = Math.ceil(installer.length / chunkSize);
const uploadId = `desktop-${version.replaceAll(".", "-")}-${randomUUID()}`;
let finalRelease = null;

console.log(`Publishing desktop ${version}: ${totalChunks} chunks, ${installer.length} bytes`);

for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
  const start = chunkIndex * chunkSize;
  const end = Math.min(start + chunkSize, installer.length);
  const form = new FormData();
  form.set("version", version);
  form.set("uploadId", uploadId);
  form.set("chunkIndex", String(chunkIndex));
  form.set("totalChunks", String(totalChunks));
  form.set("sha256", sha256);
  form.set("notes", notes);
  form.set(
    "chunk",
    new Blob([installer.subarray(start, end)], { type: "application/octet-stream" }),
    `${chunkIndex}.part`,
  );

  let response;
  let body;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(`${baseUrl}/api/v1/admin/desktop-releases/chunks`, {
      method: "POST",
      headers: {
        Cookie: cookie,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: form,
    });
    body = await response.json().catch(() => null);
    if (response.ok && body?.success) {
      break;
    }
    if (attempt === 3) {
      const details = body ? `: ${JSON.stringify(body)}` : "";
      throw new Error(
        `${body?.message || `Chunk ${chunkIndex + 1} failed (${response.status})`}${details}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }

  finalRelease = body.data.release;
  console.log(`Uploaded chunk ${chunkIndex + 1}/${totalChunks}`);
}

if (!finalRelease?.complete || finalRelease.sha256 !== sha256 || finalRelease.size !== installer.length) {
  throw new Error("Remote desktop release verification failed");
}

const statusResponse = await fetch(`${baseUrl}/api/v1/admin/desktop-releases`, {
  headers: {
    Cookie: cookie,
    "X-Requested-With": "XMLHttpRequest",
  },
});
const statusBody = await statusResponse.json().catch(() => null);
if (!statusResponse.ok || !statusBody?.data?.release?.published) {
  throw new Error("Published desktop release is not visible to the backend");
}

console.log(`Desktop ${version} published and verified: ${sha256}`);
