import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const rootDir = process.cwd();

const runStep = (command, args, label) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
      shell: false,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code ?? "unknown"}`));
    });
  });

const prismaCliPath = [
  resolve(rootDir, "node_modules", "prisma", "build", "index.js"),
  resolve(rootDir, "backend", "node_modules", "prisma", "build", "index.js"),
].find(existsSync);

if (!prismaCliPath) {
  throw new Error("Prisma CLI was not installed. Verify the deployment install step completed.");
}

// Hostinger starts the Node entry file without guaranteeing `npm` is on PATH.
await runStep(
  process.execPath,
  [
    prismaCliPath,
    "migrate",
    "deploy",
    "--schema",
    resolve(rootDir, "backend", "prisma", "schema.prisma"),
  ],
  "Prisma migrate deploy",
);
await runStep(process.execPath, ["backend/dist/bootstrap/seed.js"], "Core data bootstrap");
if (process.env.DEMO_SEED === "true") {
  await runStep(process.execPath, ["backend/dist/bootstrap/demo.js"], "Demo seed");
}
await runStep(process.execPath, ["backend/dist/server.js"], "Production server");
