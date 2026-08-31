import { createHash, randomUUID } from "crypto";
import { readdir, readFile } from "fs/promises";
import { resolve } from "path";
import mysql from "mysql2/promise";

const REQUIRED_COLUMNS = [
  ["products", "barcode", "VARCHAR(191) NULL"],
  ["products", "qrCode", "VARCHAR(191) NULL"],
  ["products", "supplierBarcode", "VARCHAR(191) NULL"],
  ["products", "videoPath", "VARCHAR(191) NULL"],
  ["products", "costPrice", "DECIMAL(10, 2) NULL"],
  ["products", "customSizeChartJson", "JSON NULL"],
  ["product_variants", "image", "VARCHAR(191) NULL"],
  ["product_variants", "barcode", "VARCHAR(191) NULL"],
  ["product_variants", "qrCode", "VARCHAR(191) NULL"],
  ["product_variants", "supplierBarcode", "VARCHAR(191) NULL"],
  ["product_variants", "costPrice", "DECIMAL(10, 2) NULL"],
  ["inventory_movements", "source", "ENUM('ONLINE', 'POS') NULL"],
  ["inventory_movements", "reference", "VARCHAR(191) NULL"],
  ["inventory_movements", "orderId", "VARCHAR(191) NULL"],
  ["inventory_movements", "posSaleId", "VARCHAR(191) NULL"],
  ["inventory_movements", "posReturnId", "VARCHAR(191) NULL"],
  ["inventory_movements", "vendorPurchaseId", "VARCHAR(191) NULL"],
  ["order_items", "unitCost", "DECIMAL(10, 2) NULL"],
  ["pos_sale_items", "unitCost", "DECIMAL(10, 2) NULL"],
  ["employees", "loginAccountId", "VARCHAR(191) NULL"],
  ["pos_sales", "cashierAccountId", "VARCHAR(191) NULL"],
];

const REQUIRED_INDEXES = [
  ["products", "products_barcode_key", ["barcode"], true],
  ["products", "products_qrCode_key", ["qrCode"], true],
  ["product_variants", "product_variants_barcode_key", ["barcode"], true],
  ["product_variants", "product_variants_qrCode_key", ["qrCode"], true],
  ["employees", "employees_loginAccountId_key", ["loginAccountId"], true],
  ["pos_sales", "pos_sales_cashierAccountId_idx", ["cashierAccountId"], false],
];

const quoteIdentifier = (value) => `\`${value.replaceAll("`", "``")}\``;

const reconcileSchema = async (connection, databaseName) => {
  const tableNames = [...new Set(REQUIRED_COLUMNS.map(([table]) => table))];
  const placeholders = tableNames.map(() => "?").join(", ");
  const [columnRows] = await connection.query(
    `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})`,
    [databaseName, ...tableNames],
  );
  const existingColumns = new Set(
    columnRows.map((row) => `${String(row.TABLE_NAME).toLowerCase()}.${String(row.COLUMN_NAME).toLowerCase()}`),
  );

  for (const [table, column, definition] of REQUIRED_COLUMNS) {
    if (existingColumns.has(`${table.toLowerCase()}.${column.toLowerCase()}`)) {
      continue;
    }

    await connection.query(
      `ALTER TABLE ${quoteIdentifier(table)} ADD COLUMN ${quoteIdentifier(column)} ${definition}`,
    );
    console.log(`Repaired missing production column ${table}.${column}.`);
  }

  const [indexRows] = await connection.query(
    `SELECT TABLE_NAME, INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (${placeholders})`,
    [databaseName, ...tableNames],
  );
  const existingIndexes = new Set(
    indexRows.map((row) => `${String(row.TABLE_NAME).toLowerCase()}.${String(row.INDEX_NAME).toLowerCase()}`),
  );

  for (const [table, indexName, columns, unique] of REQUIRED_INDEXES) {
    if (existingIndexes.has(`${table.toLowerCase()}.${indexName.toLowerCase()}`)) {
      continue;
    }

    const indexedColumns = columns.map(quoteIdentifier).join(", ");
    await connection.query(
      `CREATE ${unique ? "UNIQUE " : ""}INDEX ${quoteIdentifier(indexName)} ON ${quoteIdentifier(table)} (${indexedColumns})`,
    );
    console.log(`Repaired missing production index ${table}.${indexName}.`);
  }
};

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

    // Some shared-hosting restores retain migration history while omitting later
    // additive columns. Reconcile those known-safe additions after migrations so
    // recorded-but-incomplete schemas cannot leave catalog and POS reads broken.
    await reconcileSchema(connection, decodeURIComponent(databaseUrl.pathname.slice(1)));

    console.log("Production database migrations are current.");
  } finally {
    await connection.end();
  }
}
