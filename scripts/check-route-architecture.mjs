import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routesDir = path.join(repoRoot, "backend", "src", "routes");

const allowedDirectDataAccess = new Set([
  "health.routes.ts",
]);

const bannedPatterns = [
  { label: "raw Prisma access", pattern: /\bprisma\./g },
  { label: "manual transaction boundary", pattern: /\$transaction\b/g },
];

const listRouteFiles = (directory) => {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      return listRouteFiles(absolutePath);
    }

    if (!entry.name.endsWith(".ts")) {
      return [];
    }

    return [absolutePath];
  });
};

const routeFiles = listRouteFiles(routesDir).sort();

const violations = [];

for (const absolutePath of routeFiles) {
  const fileName = path.relative(routesDir, absolutePath).replaceAll(path.sep, "/");
  const source = fs.readFileSync(absolutePath, "utf8");

  const matches = bannedPatterns
    .map(({ label, pattern }) => ({
      label,
      count: [...source.matchAll(pattern)].length,
    }))
    .filter((entry) => entry.count > 0);

  if (matches.length === 0) {
    continue;
  }

  if (!allowedDirectDataAccess.has(fileName)) {
    violations.push({
      fileName,
      matches,
    });
  }
}

if (violations.length > 0) {
  console.error("Route architecture check failed.");
  console.error("These backend route files contain direct data access or transaction ownership and are not allowlisted:");
  for (const violation of violations) {
    const summary = violation.matches.map((entry) => `${entry.label} x${entry.count}`).join(", ");
    console.error(`- ${violation.fileName}: ${summary}`);
  }
  process.exit(1);
}

console.log("Route architecture check passed.");
console.log(`Allowlisted legacy route files: ${Array.from(allowedDirectDataAccess).sort().join(", ")}`);
