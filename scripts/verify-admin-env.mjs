import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";

const [baseUrlInput, envFileInput] = process.argv.slice(2);
if (!baseUrlInput || !envFileInput) {
  console.error("Usage: node scripts/verify-admin-env.mjs <base-url> <env-file>");
  process.exit(1);
}

const baseUrl = baseUrlInput.replace(/\/+$/, "");
const envFile = path.resolve(envFileInput);
if (!fs.existsSync(envFile)) {
  throw new Error(`Credential file not found: ${envFile}`);
}

const credentials = dotenv.parse(fs.readFileSync(envFile));
if (!credentials.ADMIN_EMAIL || !credentials.ADMIN_PASSWORD) {
  throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be present in the credential file");
}

let cookie = "";
const request = async (pathname, init = {}) => {
  const method = (init.method ?? "GET").toUpperCase();
  const response = await fetch(`${baseUrl}/api/v1${pathname}`, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(method === "GET" || method === "HEAD" ? {} : { "X-Requested-With": "XMLHttpRequest" }),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(init.headers ?? {}),
    },
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    cookie = setCookie.split(";", 1)[0] ?? cookie;
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new Error(`${method} ${pathname} failed (${response.status}): ${body?.message ?? "Unknown response"}`);
  }
  return body.data;
};

const health = await request("/health/ready");
if (health.status !== "ready") {
  throw new Error("Application readiness check did not return ready");
}

const login = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: credentials.ADMIN_EMAIL,
    password: credentials.ADMIN_PASSWORD,
  }),
});
if (login.user?.role !== "admin") {
  throw new Error("Configured account is not an administrator");
}

const [dashboard, products, syncDiagnostics] = await Promise.all([
  request("/admin/dashboard"),
  request("/admin/products"),
  request("/admin/sync-diagnostics"),
]);

await request("/auth/logout", { method: "POST" });

console.log(
  JSON.stringify({
    target: new URL(baseUrl).host,
    ready: true,
    adminLogin: true,
    dashboard: Boolean(dashboard),
    productCount: Array.isArray(products.products) ? products.products.length : null,
    registeredDevices: Array.isArray(syncDiagnostics.devices) ? syncDiagnostics.devices.length : null,
    logout: true,
  }),
);
