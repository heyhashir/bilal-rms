import { createHash, randomUUID } from "crypto";
import { readdir, readFile } from "fs/promises";
import { resolve } from "path";
import mysql from "mysql2/promise";

if (process.env.NODE_ENV !== "production") {
  console.log("Skipping production migrations outside NODE_ENV=production.");
} else {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to apply production migrations.");
  }

  const databaseUrl = new URL(process.env.DATABASE_URL);
  const connection = await mysql.createConnection({
    host: databaseUrl.hostname,
    port: Number(databaseUrl.port || 3306),
    user: decodeURIComponent(databaseUrl.username),
    password: decodeURIComponent(databaseUrl.password),
    database: decodeURIComponent(databaseUrl.pathname.slice(1)),
    multipleStatements: true,
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
        \`id\` VARCHAR(36) NOT NULL,
        \`checksum\` VARCHAR(64) NOT NULL,
        \`finished_at\` DATETIME(3) NULL,
        \`migration_name\` VARCHAR(255) NOT NULL,
        \`logs\` TEXT NULL,
        \`rolled_back_at\` DATETIME(3) NULL,
        \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0,
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query(
      "SELECT migration_name FROM `_prisma_migrations` WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL",
    );
    const applied = new Set(appliedRows.map((row) => row.migration_name));
    const migrationsDir = resolve(process.cwd(), "backend", "prisma", "migrations");
    const migrationNames = (await readdir(migrationsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();

    for (const migrationName of migrationNames) {
      if (applied.has(migrationName)) {
        continue;
      }

      const sql = await readFile(resolve(migrationsDir, migrationName, "migration.sql"), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const migrationId = randomUUID();

      await connection.query(
        "INSERT INTO `_prisma_migrations` (id, checksum, migration_name) VALUES (?, ?, ?)",
        [migrationId, checksum, migrationName],
      );

      try {
        if (sql.replace(/--.*$/gm, "").trim()) {
          await connection.query(sql);
        }
        await connection.query(
          "UPDATE `_prisma_migrations` SET finished_at = CURRENT_TIMESTAMP(3), applied_steps_count = 1 WHERE id = ?",
          [migrationId],
        );
        console.log(`Applied migration ${migrationName}.`);
      } catch (error) {
        await connection.query("UPDATE `_prisma_migrations` SET logs = ? WHERE id = ?", [String(error), migrationId]);
        throw error;
      }
    }

    console.log("Production database migrations are current.");
  } finally {
    await connection.end();
  }
}
