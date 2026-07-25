import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(desktopDir, "package.json"), "utf8"));
const artifactName = `BilalRMS-Setup-${packageJson.version}.exe`;
const stagingDir = fs.mkdtempSync(path.join(os.tmpdir(), `bilal-rms-desktop-${packageJson.version}-`));
const releaseDir = path.join(desktopDir, "dist");
const cliPath = path.join(desktopDir, "node_modules", "electron-builder", "out", "cli", "cli.js");

const runBuilder = () =>
  new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        cliPath,
        "--win",
        "nsis",
        `--config.directories.output=${stagingDir.replaceAll("\\", "/")}`,
      ],
      {
        cwd: desktopDir,
        env: process.env,
        stdio: "inherit",
      },
    );

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`electron-builder failed with exit code ${code ?? "unknown"}`));
    });
  });

try {
  await runBuilder();
  fs.mkdirSync(releaseDir, { recursive: true });

  for (const fileName of [artifactName, `${artifactName}.blockmap`]) {
    const source = path.join(stagingDir, fileName);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, path.join(releaseDir, fileName));
    }
  }

  const installerPath = path.join(releaseDir, artifactName);
  if (!fs.existsSync(installerPath)) {
    throw new Error(`Expected installer was not created: ${artifactName}`);
  }

  const sizeMb = fs.statSync(installerPath).size / 1024 / 1024;
  console.log(`Windows installer ready: ${installerPath} (${sizeMb.toFixed(1)} MB)`);
} finally {
  fs.rmSync(stagingDir, { recursive: true, force: true });
}
