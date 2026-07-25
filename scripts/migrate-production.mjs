import { spawn } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

if (process.env.NODE_ENV !== "production") {
  console.log("Skipping production migrations outside NODE_ENV=production.");
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to apply production migrations.");
  }

  const rootDir = process.cwd();
  const prismaCliPath = [
    resolve(rootDir, "node_modules", "prisma", "build", "index.js"),
    resolve(rootDir, "backend", "node_modules", "prisma", "build", "index.js"),
  ].find(existsSync);

  if (!prismaCliPath) {
    throw new Error("Prisma CLI was not installed. Verify the deployment install step completed.");
  }

  await new Promise((resolvePromise, reject) => {
    const child = spawn(
      process.execPath,
      [
        prismaCliPath,
        "migrate",
        "deploy",
        "--schema",
        resolve(rootDir, "backend", "prisma", "schema.prisma"),
      ],
      {
        cwd: rootDir,
        env: process.env,
        stdio: "inherit",
        shell: false,
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      reject(new Error(`Prisma migrate deploy failed with exit code ${code ?? "unknown"}`));
    });
  });
}
