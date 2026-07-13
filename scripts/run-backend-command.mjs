import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const envPaths = [
  path.join(rootDir, ".env"),
  path.join(rootDir, "backend", ".env"),
  path.join(rootDir, "backend", ".env.local"),
];

const env = { ...process.env };
for (const envPath of envPaths) {
  if (!fs.existsSync(envPath)) {
    continue;
  }

  const parsed = dotenv.parse(fs.readFileSync(envPath));
  Object.assign(env, parsed);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("No command provided to run-backend-command.");
  process.exit(1);
}

const resolvedCommand =
  process.platform === "win32" && (command === "npm" || command === "npx" || command === "node")
    ? `${command}.cmd`
    : command;

const result = spawnSync(resolvedCommand, args, {
  cwd: rootDir,
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
