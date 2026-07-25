// Hostinger monitors the entry process itself and expects it to bind promptly.
// Importing the compiled server keeps Express in this process instead of a child.
await import("../backend/dist/server.js");
