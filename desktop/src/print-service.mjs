import http from "node:http";
import { timingSafeEqual } from "node:crypto";

export function startPrintService({ token, origins, listPrinters, getProfiles, saveProfiles, print, port = 17841 }) {
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host || "";
    const port = server.address().port;
    if (!origins.includes(origin) || (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`)) {
      res.writeHead(403).end(); return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Cache-Control", "no-store");
    if (req.method === "OPTIONS") {
      res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
      res.setHeader("Access-Control-Allow-Private-Network", "true");
      res.writeHead(204).end(); return;
    }
    const supplied = Buffer.from(req.headers.authorization ?? "");
    const expected = Buffer.from(`Bearer ${token}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      res.writeHead(401).end(JSON.stringify({ error: "Pair this browser using the code in the desktop app's Printer presets." })); return;
    }
    res.setHeader("Content-Type", "application/json");
    try {
      let result;
      if (req.method === "GET" && req.url === "/profiles") result = getProfiles();
      else if (req.method === "GET" && req.url === "/printers") result = await listPrinters();
      else if (["POST", "PUT"].includes(req.method)) {
        const chunks = [];
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 10 * 1024 * 1024) throw new Error("Print job too large; print a smaller batch");
          chunks.push(chunk);
        }
        const payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (req.method === "PUT" && req.url === "/profiles") result = saveProfiles(payload);
        else if (req.method === "POST" && req.url === "/receipt") result = await print("receipt", payload);
        else if (req.method === "POST" && req.url === "/stickers") result = await print("sticker", payload);
        else { res.writeHead(404).end(); return; }
      } else { res.writeHead(404).end(); return; }
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(400).end(JSON.stringify({ error: error.message }));
    }
  });
  server.requestTimeout = 70000;
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}
