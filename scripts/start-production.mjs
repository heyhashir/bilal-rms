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
