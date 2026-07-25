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

const runProductionBootstrap = async () => {
  await runStep(
    process.execPath,
    ["scripts/prepare-prisma-engines.mjs"],
    "Prisma engine permission preparation",
  );

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

  if (process.env.DEMO_SEED === "true") {
    await runStep(process.execPath, ["backend/dist/bootstrap/demo.js"], "Demo seed");
  }
};

// Bind Express first: Hostinger marks applications unhealthy if they do not
// listen quickly. The server's readiness worker waits for migrations and seeds.
void runProductionBootstrap().catch((error) => {
  console.error("Production database bootstrap failed; the readiness endpoint will remain unavailable.", error);
});

await runStep(process.execPath, ["backend/dist/server.js"], "Production server");
