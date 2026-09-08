import { getDesktopBridge, type DesktopBridge, type PrinterProfiles } from "./desktop-bridge";

const KEY = "bilal_rms_print_pairing";
export const hasOneClickPrinting = () => Boolean(getDesktopBridge() || localStorage.getItem(KEY));
export const pairPrintHelper = (token: string) => localStorage.setItem(KEY, token.trim());
export const disconnectPrintHelper = () => localStorage.removeItem(KEY);

async function request<T>(path: string, method = "GET", payload?: unknown): Promise<T> {
  const token = localStorage.getItem(KEY);
  if (!token) throw new Error("Set up one-click printing first");
  let response: Response;
  try {
    response = await fetch(`http://127.0.0.1:17841${path}`, { method, headers: {
      Authorization: `Bearer ${token}`, "Content-Type": "application/json",
    }, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }), signal: AbortSignal.timeout(method === "POST" ? 65000 : 8000) });
  } catch {
    throw new Error("Cannot reach the print helper. Keep the latest desktop app open and allow this site's local-network access. Check the printer queue before retrying; a submitted job may still print.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Print helper rejected the request");
  return data as T;
}

export const printingClient = {
  async getProfiles(): Promise<PrinterProfiles> {
    return getDesktopBridge()?.getPrinterProfiles() ?? request<PrinterProfiles>("/profiles");
  },
  async saveProfiles(profiles: PrinterProfiles) {
    return getDesktopBridge()?.savePrinterProfiles(profiles) ?? request<PrinterProfiles>("/profiles", "PUT", profiles);
  },
  async listPrinters(): Promise<Array<{ name: string; displayName: string; isDefault: boolean }>> {
    return getDesktopBridge()?.listPrinters() ?? request("/printers");
  },
  async receipt(payload: Parameters<DesktopBridge["printReceipt"]>[0]) {
    const bridge = getDesktopBridge();
    if (bridge) return bridge.printReceipt(payload);
    return request("/receipt", "POST", payload);
  },
  async stickers(payload: Parameters<NonNullable<DesktopBridge["printStickers"]>>[0]) {
    const bridge = getDesktopBridge();
    if (bridge?.printStickers) return bridge.printStickers(payload);
    return request("/stickers", "POST", payload);
  },
};
