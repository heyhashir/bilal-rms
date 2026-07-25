import type { DesktopBridge } from "@/lib/desktop-bridge";

declare global {
  interface Window {
    bilalDesktop?: DesktopBridge;
  }
}

export {};
