import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const resetDb = process.argv.includes("--reset-db");
const portIndex = process.argv.indexOf("--port");
const requestedPort = portIndex >= 0 ? process.argv[portIndex + 1] : undefined;
const runtimeEnv = {
  ...process.env,
  PRISMA_HIDE_UPDATE_MESSAGE: "1",
  ...(requestedPort
    ? {
        PORT: requestedPort,
        APP_URL: `http://127.0.0.1:${requestedPort}`,
      }
    : {}),
};

const readLocalDatabasePort = () => {
  const envFiles = [
    path.join(rootDir, "backend", ".env.local"),
    path.join(rootDir, "backend", ".env"),
    path.join(rootDir, ".env"),
  ];

  for (const envFile of envFiles) {
    if (!fs.existsSync(envFile)) {
      continue;
    }

    const parsed = dotenv.parse(fs.readFileSync(envFile));
    const databaseUrl = parsed.DATABASE_URL ?? runtimeEnv.DATABASE_URL;
    if (!databaseUrl) {
      continue;
    }

    try {
      const normalized = databaseUrl.replace(/^"|"$/g, "");
      const url = new URL(normalized);
      return Number(url.port || "3306");
    } catch {
      // Ignore malformed URLs and continue to the next candidate.
    }
  }

  return Number(process.env.LOCAL_DB_PORT || "3307");
};

const localDbPort = readLocalDatabasePort();
runtimeEnv.LOCAL_DB_PORT = String(localDbPort);

const resolveCommand = (command) => {
  if (process.platform !== "win32") {
    return command;
  }

  if (command === "npm") {
    return "npm.cmd";
  }

  if (command === "docker") {
    return "docker.exe";
  }

  return command;
};

const quoteWindowsArg = (value) => {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
};

const spawnResult = (command, args) => {
  const resolvedCommand = resolveCommand(command);
  if (process.platform === "win32") {
    const windowsCommand = [resolvedCommand, ...args].map(quoteWindowsArg).join(" ");
    return spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", windowsCommand], {
      cwd: rootDir,
      stdio: "inherit",
      env: runtimeEnv,
    });
  }

  return spawnSync(resolvedCommand, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: runtimeEnv,
  });
};

const run = (command, args) => {
  const resolvedCommand = resolveCommand(command);
  const result = spawnResult(command, args);

  if (result.error) {
    console.error(`[start-local-server] Failed to spawn ${resolvedCommand}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const runWithRetry = async (command, args, { attempts = 3, delayMs = 3000, label = args.join(" ") } = {}) => {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const resolvedCommand = resolveCommand(command);
    const result = spawnResult(command, args);

    if (result.error) {
      console.error(`[start-local-server] Failed to spawn ${resolvedCommand}:`, result.error.message);
      process.exit(1);
    }

    if (result.status === 0) {
      return;
    }

    if (attempt === attempts) {
      process.exit(result.status ?? 1);
    }

    console.warn(`[start-local-server] ${label} failed on attempt ${attempt}/${attempts}. Retrying in ${delayMs}ms...`);
    await sleep(delayMs);
  }
};

run("npm", ["run", "env:local"]);

if (resetDb) {
  run("docker", ["compose", "down", "--volumes", "--remove-orphans"]);
}

run("docker", ["compose", "up", "-d", "mariadb"]);
run("node", ["scripts/wait-for-port.mjs", "127.0.0.1", String(localDbPort), "180000", "MariaDB"]);
// A fresh MariaDB volume may accept TCP connections before its initialization
// entrypoint has finished. Keep retrying the migration/seed steps until the
// database is genuinely ready instead of failing the browser harness early.
await runWithRetry("npm", ["run", "db:deploy"], { attempts: 30, delayMs: 5000, label: "db:deploy" });
await runWithRetry("npm", ["run", "seed"], { attempts: 10, delayMs: 5000, label: "seed" });
run("npm", ["run", "build"]);

const child = spawn("node", ["backend/dist/server.js"], {
  cwd: rootDir,
  stdio: "inherit",
  env: runtimeEnv,
});

const forwardSignal = (signal) => {
  if (!child.killed) {
    child.kill(signal);
  }
};

process.on("SIGINT", () => forwardSignal("SIGINT"));
process.on("SIGTERM", () => forwardSignal("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
