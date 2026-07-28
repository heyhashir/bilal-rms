import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import { createHash } from "node:crypto";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import { createLocalStore } from "./local-store.mjs";
import { createReceiptHtml } from "./receipt-template.mjs";

// Electron GPU compositing can leave a permanently white window on Windows RDP
// sessions. The POS UI is lightweight, so software rendering is the safer default.
app.disableHardwareAcceleration();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopPackage = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const resolveFrontendDir = () => {
  const appPath = app.getAppPath();
  const candidates = [
    path.resolve(process.resourcesPath, "public"),
    path.resolve(appPath, "public"),
    path.resolve(appPath, "backend", "public"),
    path.resolve(appPath, "..", "backend", "public"),
    path.resolve(__dirname, "..", "..", "backend", "public"),
    path.resolve(process.cwd(), "backend", "public"),
  ];

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, "index.html"))) ?? candidates[0];
};

const remoteBaseUrl =
  process.env.BILAL_RMS_REMOTE_URL?.trim().replace(/\/+$/, "") ||
  process.env.APP_URL?.trim().replace(/\/+$/, "") ||
  "https://balybybilalgarments.com";

const remoteUrl = new URL(remoteBaseUrl);
if (!["http:", "https:"].includes(remoteUrl.protocol)) {
  throw new Error("BILAL_RMS_REMOTE_URL must use http or https");
}

let mainWindow = null;
let localServer = null;
let localOrigin = "";
let store = null;

let startupLogPath = process.env.BILAL_RMS_STARTUP_LOG?.trim() || "";
const startupStartedAt = Date.now();
const configureStartupLog = () => {
  if (!startupLogPath) {
    startupLogPath = path.join(app.getPath("userData"), "runtime", "desktop.log");
  }

  fs.mkdirSync(path.dirname(startupLogPath), { recursive: true });
  fs.appendFileSync(
    startupLogPath,
    `\n${new Date().toISOString()} Bilal RMS POS ${desktopPackage.version} starting\n`,
  );
};

const writeRuntimeLog = (message) => {
  if (!startupLogPath) {
    return;
  }

  fs.appendFileSync(startupLogPath, `${new Date().toISOString()} ${message}\n`);
};

const logStartupStage = (stage) => {
  writeRuntimeLog(`${Date.now() - startupStartedAt}ms ${stage}`);
};

const isCloudPath = (pathname) =>
  pathname === "/api" ||
  pathname.startsWith("/api/") ||
  pathname === "/uploads" ||
  pathname.startsWith("/uploads/") ||
  pathname === "/desktop" ||
  pathname.startsWith("/desktop/");

const normalizeProxyCookies = (cookies) =>
  cookies?.map((cookie) =>
    cookie
      .replace(/;\s*Secure\b/gi, "")
      .replace(/;\s*Domain=[^;]+/gi, ""),
  );

const proxyCloudRequest = (req, res, requestUrl) => {
  const target = new URL(`${requestUrl.pathname}${requestUrl.search}`, remoteUrl);
  const transport = target.protocol === "https:" ? https : http;
  const headers = {
    ...req.headers,
    host: target.host,
    origin: remoteUrl.origin,
    referer: `${remoteUrl.origin}/`,
    "x-forwarded-host": remoteUrl.host,
    "x-forwarded-proto": remoteUrl.protocol.slice(0, -1),
  };

  delete headers.connection;

  const upstream = transport.request(
    target,
    {
      method: req.method,
      headers,
      timeout: 30_000,
    },
    (upstreamResponse) => {
      const responseHeaders = { ...upstreamResponse.headers };
      const proxyCookies = normalizeProxyCookies(upstreamResponse.headers["set-cookie"]);
      if (proxyCookies) {
        responseHeaders["set-cookie"] = proxyCookies;
      }
      delete responseHeaders["content-security-policy"];
      delete responseHeaders["content-security-policy-report-only"];

      res.writeHead(upstreamResponse.statusCode ?? 502, responseHeaders);
      upstreamResponse.pipe(res);
    },
  );

  upstream.on("timeout", () => {
    upstream.destroy(new Error("Cloud request timed out"));
  });
  upstream.on("error", (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    const isApiRequest = requestUrl.pathname.startsWith("/api/");
    res.writeHead(503, {
      "Content-Type": isApiRequest ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(
      isApiRequest
        ? JSON.stringify({
            success: false,
            message: "The cloud service is unavailable. Offline POS data remains available.",
            data: null,
          })
        : "Cloud media is temporarily unavailable.",
    );
  });

  req.pipe(upstream);
};

const startStaticServer = async (frontendDir) =>
  await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
      if (isCloudPath(requestUrl.pathname)) {
        proxyCloudRequest(req, res, requestUrl);
        return;
      }

      const safePath = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
      const assetPath = path.normalize(path.join(frontendDir, safePath));
      const isWithinFrontend = assetPath.startsWith(frontendDir);

      const sendIndex = () => {
        const htmlPath = path.join(frontendDir, "index.html");
        const html = fs.readFileSync(htmlPath);
        res.writeHead(200, { "Content-Type": CONTENT_TYPES[".html"] });
        res.end(html);
      };

      if (!isWithinFrontend) {
        sendIndex();
        return;
      }

      if (fs.existsSync(assetPath) && fs.statSync(assetPath).isFile()) {
        const extension = path.extname(assetPath).toLowerCase();
        res.writeHead(200, {
          "Content-Type": CONTENT_TYPES[extension] ?? "application/octet-stream",
        });
        fs.createReadStream(assetPath).pipe(res);
        return;
      }

      sendIndex();
    });

    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Unable to bind desktop frontend server"));
        return;
      }

      resolve({
        server,
        origin: `http://127.0.0.1:${address.port}`,
      });
    });
  });

const printReceipt = async ({ sale, settings }) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      sandbox: false,
    },
  });

  const html = createReceiptHtml({ sale, settings });
  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  await new Promise((resolve, reject) => {
    printWindow.webContents.print(
      {
        silent: false,
        printBackground: true,
        margins: {
          marginType: "none",
        },
      },
      (success, failureReason) => {
        printWindow.close();
        if (!success) {
          reject(new Error(failureReason || "Print failed"));
          return;
        }

        resolve();
      },
    );
  });
};

const downloadUpdateInstaller = async (installerUrl) => {
  const response = await fetch(installerUrl, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`Unable to download update installer (${response.status})`);
  }

  const fileName = path.basename(new URL(installerUrl).pathname) || `BilalRMS-Setup-${Date.now()}.exe`;
  const downloadDir = path.join(app.getPath("temp"), "bilal-rms-updates");
  fs.mkdirSync(downloadDir, { recursive: true });
  const destinationPath = path.join(downloadDir, fileName);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destinationPath));
  return destinationPath;
};

const hashFile = async (filePath) =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(hash.digest("hex")));
  });

const registerIpc = () => {
  ipcMain.on("bilal-desktop:get-device-key", (event) => {
    event.returnValue = store.getDeviceKey();
  });

  ipcMain.on("bilal-desktop:load-pos-cache", (event) => {
    event.returnValue = store.loadPosCache();
  });

  ipcMain.on("bilal-desktop:save-pos-cache", (_event, cache) => {
    store.savePosCache(cache);
  });

  ipcMain.on("bilal-desktop:load-pos-sync-state", (event) => {
    event.returnValue = store.loadPosSyncState();
  });

  ipcMain.on("bilal-desktop:save-pos-sync-state", (_event, syncState) => {
    store.savePosSyncState(syncState);
  });

  ipcMain.on("bilal-desktop:patch-pos-sync-state", (event, patch) => {
    event.returnValue = store.patchPosSyncState(patch);
  });

  ipcMain.on("bilal-desktop:load-queued-sales", (event) => {
    event.returnValue = store.loadQueuedSales();
  });
  ipcMain.on("bilal-desktop:load-queued-refunds", (event) => {
    event.returnValue = store.loadQueuedRefunds();
  });

  ipcMain.on("bilal-desktop:queue-pos-sale", (_event, sale) => {
    store.queuePosSale(sale);
  });

  ipcMain.on("bilal-desktop:remove-queued-sale", (_event, saleNumber) => {
    store.removeQueuedSale(saleNumber);
  });
  ipcMain.on("bilal-desktop:queue-pos-refund", (_event, refund) => {
    store.queuePosRefund(refund);
  });
  ipcMain.on("bilal-desktop:remove-queued-refund", (_event, jobKey) => {
    store.removeQueuedRefund(jobKey);
  });

  ipcMain.on("bilal-desktop:persist-offline-sale", (event, payload) => {
    event.returnValue = store.persistOfflineSale(payload);
  });
  ipcMain.on("bilal-desktop:persist-offline-refund", (event, payload) => {
    event.returnValue = store.persistOfflineRefund(payload);
  });

  ipcMain.on("bilal-desktop:list-offline-receipts", (event) => {
    event.returnValue = store.listOfflineReceipts();
  });

  ipcMain.on("bilal-desktop:get-offline-receipt", (event, receiptOrSaleNumber) => {
    event.returnValue = store.getOfflineReceipt(receiptOrSaleNumber);
  });

  ipcMain.on("bilal-desktop:remember-receipt", (_event, sale) => {
    store.rememberReceipt(sale);
  });

  ipcMain.on("bilal-desktop:cache-current-user", (_event, user) => {
    store.cacheCurrentUser(user);
  });

  ipcMain.on("bilal-desktop:get-cached-current-user", (event) => {
    event.returnValue = store.getCachedCurrentUser();
  });

  ipcMain.on("bilal-desktop:get-context", (event) => {
    event.returnValue = {
      ...store.getDesktopContext(),
      cloudApiBaseUrl: localOrigin,
      cloudOrigin: remoteUrl.origin,
    };
  });

  ipcMain.handle("bilal-desktop:print-receipt", async (_event, payload) => {
    await printReceipt(payload);
    return { ok: true };
  });

  ipcMain.handle("bilal-desktop:check-for-updates", async (_event, payload) => {
    const baseUrl = payload?.baseUrl?.trim() || store.cloudApiBaseUrl || remoteBaseUrl;
    if (!baseUrl) {
      return {
        deviceKey: payload.deviceKey,
        currentVersion: payload.currentVersion ?? null,
        latestVersion: store.getDesktopContext().appVersion,
        available: false,
        mandatory: false,
        notes: "",
        publishedAt: Date.now(),
        windows: null,
      };
    }

    const manifestUrl = `${baseUrl.replace(/\/+$/, "")}/api/v1/sync/updates/${encodeURIComponent(payload.deviceKey)}${payload.currentVersion ? `?currentVersion=${encodeURIComponent(payload.currentVersion)}` : ""}`;
    const response = await fetch(manifestUrl, {
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    });
    const body = await response.json();
    if (!response.ok || !body?.success) {
      throw new Error(body?.message ?? "Unable to load desktop update manifest");
    }

    return body.data.manifest;
  });

  ipcMain.handle("bilal-desktop:open-url", async (_event, url) => {
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle("bilal-desktop:install-update", async (_event, payload) => {
    const installerUrl = payload?.installerUrl?.trim();
    if (!installerUrl) {
      throw new Error("Installer URL is required");
    }

    const installerPath = await downloadUpdateInstaller(installerUrl);
    const installerStat = fs.statSync(installerPath);
    if (payload?.expectedSize && installerStat.size !== payload.expectedSize) {
      fs.rmSync(installerPath, { force: true });
      throw new Error("Downloaded update size does not match the published release");
    }
    if (payload?.expectedSha256) {
      const actualSha256 = await hashFile(installerPath);
      if (actualSha256.toLowerCase() !== payload.expectedSha256.toLowerCase()) {
        fs.rmSync(installerPath, { force: true });
        throw new Error("Downloaded update checksum does not match the published release");
      }
    }
    const openResult = await shell.openPath(installerPath);
    if (openResult) {
      throw new Error(openResult);
    }

    setTimeout(() => {
      app.quit();
    }, 750);

    return {
      ok: true,
      installerPath,
    };
  });
};

const createMainWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#f5f1e8",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
      contextIsolation: true,
      sandbox: false,
    },
  });

  logStartupStage("window-created");
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    logStartupStage("window-shown");
  });
  mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedUrl) => {
    writeRuntimeLog(`renderer-load-failed code=${errorCode} url=${validatedUrl} error=${errorDescription}`);
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    writeRuntimeLog(`renderer-process-gone reason=${details.reason} exitCode=${details.exitCode}`);
  });
  mainWindow.on("unresponsive", () => {
    writeRuntimeLog("window-unresponsive");
  });

  try {
    await mainWindow.loadURL(`${localOrigin}/login`);
    logStartupStage("login-loaded");
    if (!mainWindow.isVisible()) {
      mainWindow.show();
      logStartupStage("window-shown-after-load");
    }
  } catch (error) {
    writeRuntimeLog(`login-load-error ${error instanceof Error ? error.message : String(error)}`);
    if (!mainWindow.isVisible()) {
      mainWindow.show();
    }
    throw error;
  }
};

app.whenReady().then(async () => {
  configureStartupLog();
  logStartupStage("electron-ready");
  store = await createLocalStore({
    userDataPath: path.join(app.getPath("userData"), "runtime"),
    cloudApiBaseUrl: remoteBaseUrl,
    appVersion: desktopPackage.version,
    moduleBasePath: path.join(__dirname, ".."),
  });
  logStartupStage("local-store-ready");
  const frontendDir = resolveFrontendDir();
  const { server, origin } = await startStaticServer(frontendDir);
  localServer = server;
  localOrigin = origin;
  logStartupStage("static-server-ready");
  registerIpc();
  logStartupStage("ipc-ready");
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (localServer) {
    localServer.close();
  }
});
