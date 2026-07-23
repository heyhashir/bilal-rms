import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const externallyProvidedEnv = new Set(Object.keys(process.env));
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
  for (const [key, value] of Object.entries(parsed)) {
    if (!externallyProvidedEnv.has(key)) {
      env[key] = value;
    }
  }
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("No command provided to run-backend-command.");
  process.exit(1);
}

const isWindowsShellCommand = process.platform === "win32" && (command === "npm" || command === "npx");
const spawnCommand = isWindowsShellCommand ? "cmd.exe" : command;
const spawnArgs = isWindowsShellCommand ? ["/d", "/s", "/c", `${command} ${args.join(" ")}`] : args;

const result = spawnSync(spawnCommand, spawnArgs, {
  cwd: rootDir,
  stdio: "inherit",
  env,
  shell: false,
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
