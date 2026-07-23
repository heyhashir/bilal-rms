import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourcePath = path.join(rootDir, "backend", ".env.local.example");
const targetPath = path.join(rootDir, "backend", ".env.local");

if (!fs.existsSync(sourcePath)) {
  console.error(`Missing local env example at ${sourcePath}`);
  process.exit(1);
}

if (!fs.existsSync(targetPath)) {
  fs.copyFileSync(sourcePath, targetPath);
  console.log(`Created ${targetPath} from example defaults.`);
} else {
  console.log(`Using existing ${targetPath}.`);
}
