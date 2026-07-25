import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const desktopPackagePath = path.join(rootDir, "desktop", "package.json");
const desktopPackage = JSON.parse(fs.readFileSync(desktopPackagePath, "utf8"));
const version = desktopPackage.version;

const sourceInstallerPath = path.join(rootDir, "desktop", "dist", `BilalRMS-Setup-${version}.exe`);
if (!fs.existsSync(sourceInstallerPath)) {
  console.error(`Desktop installer not found at ${sourceInstallerPath}`);
  console.error('Run "npm run desktop:dist" first.');
  process.exit(1);
}

const targetDir = path.join(rootDir, "storage", "desktop", "windows");
fs.mkdirSync(targetDir, { recursive: true });

const targetInstallerPath = path.join(targetDir, `BilalRMS-Setup-${version}.exe`);
fs.copyFileSync(sourceInstallerPath, targetInstallerPath);

const metadataPath = path.join(targetDir, "latest.json");
fs.writeFileSync(
  metadataPath,
  JSON.stringify(
    {
      version,
      installerFile: path.basename(targetInstallerPath),
      publishedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);

console.log(`Published desktop installer ${version} to ${targetInstallerPath}`);
