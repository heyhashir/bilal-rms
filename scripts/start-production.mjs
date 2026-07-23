import { spawn } from "child_process";

const rootDir = process.cwd();

const resolveCommand = (command) =>
  process.platform === "win32" && (command === "npm" || command === "npx")
    ? "cmd.exe"
    : command;

const runStep = (command, args, label) =>
  new Promise((resolve, reject) => {
    const spawnArgs =
      process.platform === "win32" && (command === "npm" || command === "npx")
        ? ["/d", "/s", "/c", `${command} ${args.join(" ")}`]
        : args;

    const child = spawn(resolveCommand(command), spawnArgs, {
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

await runStep("npm", ["run", "db:deploy"], "Prisma migrate deploy");
if (process.env.DEMO_SEED === "true") {
  await runStep("node", ["backend/dist/bootstrap/demo.js"], "Demo seed");
}
await runStep("node", ["backend/dist/server.js"], "Production server");
