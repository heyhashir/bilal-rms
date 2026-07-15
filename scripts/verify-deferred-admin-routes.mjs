import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesDir = path.join(repoRoot, "src", "routes");
const adminLayoutPath = path.join(routesDir, "admin.tsx");

const deferredRoutes = [
  { file: "admin.activity.tsx", path: "/admin/activity" },
  { file: "admin.cms.tsx", path: "/admin/cms" },
  { file: "admin.coupons.tsx", path: "/admin/coupons" },
  { file: "admin.discounts.tsx", path: "/admin/discounts" },
  { file: "admin.notifications.tsx", path: "/admin/notifications" },
  { file: "admin.purchase-orders.tsx", path: "/admin/purchase-orders" },
  { file: "admin.roles.tsx", path: "/admin/roles" },
  { file: "admin.seo.tsx", path: "/admin/seo" },
  { file: "admin.size-charts.tsx", path: "/admin/size-charts" },
  { file: "admin.suppliers.tsx", path: "/admin/suppliers" },
];

const adminLayoutSource = fs.readFileSync(adminLayoutPath, "utf8");
const navTargets = new Set(
  [...adminLayoutSource.matchAll(/to:\s*"([^"]+)"/g)].map((match) => match[1]),
);

const failures = [];

for (const deferredRoute of deferredRoutes) {
  const routePath = path.join(routesDir, deferredRoute.file);

  if (!fs.existsSync(routePath)) {
    failures.push(`${deferredRoute.file} is missing`);
    continue;
  }

  const source = fs.readFileSync(routePath, "utf8");

  if (!source.includes('NotInScope')) {
    failures.push(`${deferredRoute.file} does not render the shared NotInScope state`);
  }

  if (!source.includes(`createFileRoute("${deferredRoute.path}")`)) {
    failures.push(`${deferredRoute.file} is not mapped to ${deferredRoute.path}`);
  }

  if (navTargets.has(deferredRoute.path)) {
    failures.push(`${deferredRoute.path} still appears in the admin navigation`);
  }
}

if (failures.length > 0) {
  console.error("Deferred admin route verification failed.");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Deferred admin route verification passed.");
console.log(`Verified ${deferredRoutes.length} deferred admin routes are explicit NotInScope screens and absent from navigation.`);
