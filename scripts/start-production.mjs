const hostingerDefaults = {
  NODE_ENV: "production",
  APP_URL: "https://balybybilalgarments.com",
  SESSION_COOKIE_NAME: "bilal_rms_session",
  SESSION_TTL_DAYS: "30",
  UPLOAD_DIR: "storage/uploads",
  IMPORT_DIR: "storage/runtime-imports",
  PUBLIC_DIR: "backend/public",
  MAX_UPLOAD_MB: "10",
  DESKTOP_UPDATE_BASE_URL: "https://balybybilalgarments.com",
  DESKTOP_RELEASE_DIR: "storage/desktop",
};

for (const [key, value] of Object.entries(hostingerDefaults)) {
  process.env[key] ||= value;
}

const hostingerDatabase = {
  host: "127.0.0.1",
  port: "3306",
  user: "u216146629_baly_app",
  database: "u216146629_baly_rms",
};

if (process.env.DB_PASSWORD) {
  process.env.DATABASE_URL =
    `mysql://${encodeURIComponent(hostingerDatabase.user)}:${encodeURIComponent(process.env.DB_PASSWORD)}` +
    `@${hostingerDatabase.host}:${hostingerDatabase.port}/${encodeURIComponent(hostingerDatabase.database)}`;
  console.log("Configured Hostinger MySQL from the production DB password.");
} else if (process.env.DATABASE_URL) {
  const databaseUrl = new URL(process.env.DATABASE_URL);
  if (databaseUrl.hostname === "localhost") {
    databaseUrl.hostname = "127.0.0.1";
    process.env.DATABASE_URL = databaseUrl.toString();
    console.log("Normalized DATABASE_URL to use IPv4 for Hostinger MySQL.");
  }
} else {
  throw new Error("DB_PASSWORD is required for the Hostinger MySQL connection.");
}

// Hostinger monitors the entry process itself and expects it to bind promptly.
// Importing the compiled server keeps Express in this process instead of a child.
await import("../backend/dist/server.js");

// The Hostinger build container cannot access the runtime-local MySQL service.
// Apply migrations only after Express has bound its port in the runtime process.
void (async () => {
  await import("./prepare-prisma-engines.mjs");
  await import("./migrate-production.mjs");
})().catch((error) => {
  console.error("Production migration failed; readiness will retry database initialization.", error);
});
