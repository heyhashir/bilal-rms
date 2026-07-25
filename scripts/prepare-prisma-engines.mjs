import { chmod, readdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";

// Some managed Linux deployments unpack Prisma's CLI engines without execute
// permission. Prisma migrations require the schema engine to be executable.
const enginesDir = join(process.cwd(), "node_modules", "@prisma", "engines");

if (process.platform === "win32" || !existsSync(enginesDir)) {
  process.exit(0);
}

const engineFiles = (await readdir(enginesDir)).filter((fileName) =>
  /^(schema|query)-engine-/.test(fileName),
);

for (const fileName of engineFiles) {
  await chmod(join(enginesDir, fileName), 0o755);
}

console.log(`Prepared ${engineFiles.length} Prisma CLI engine(s) for Linux execution.`);
