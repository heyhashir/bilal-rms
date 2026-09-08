# One-Click Printing

## First Setup On The Shop PC

1. Install desktop 0.4.1 or later and the Windows drivers for both printers.
2. Open POS > Change printer presets (also available in receipt/sticker dialogs).
3. Select the receipt printer. Use 72 mm width and 3 mm padding for the agreed bill layout.
4. Select the sticker printer and enter the measured label width/height, offsets and copies. Configure the matching gap/sensor, density, speed and cutter in its Windows driver. Do not substitute Credit Card or Fit to page.
5. Save. Either printer may be configured independently. Print a small real sample once to calibrate the actual roll.

Later, Print sends directly to the saved printer at 100%, with no headers/footers or browser dialog. Rotation changes sticker content, not paper dimensions. If a barcode cannot fit without squeezing, choose a suitable roll/design or a shorter barcode rather than defeating the fit guard.

## Website Printing

Keep the desktop app open on the same PC. In its Printer presets, select/copy the private Browser pairing code. On the website open Printer preset/Change printer preset, enter that code, and click Connect desktop printer helper. Allow local-network access if prompted, then save the profiles. This only needs doing once for each browser profile.

The website then sends Print jobs to the same saved receipt/sticker printers. Browser print dialog is an explicit fallback for PCs without the helper and cannot silently select a printer. PDF and OneNote drivers can display their own file-save dialogs even when Electron uses silent printing.

## Errors And Security

- Missing printer: reconnect it or select its exact installed name in the preset. No automatic default-printer fallback occurs.
- Connection error: ensure the latest desktop app is open, no other copy owns port 17841, and browser site permissions allow local-network access. Check the Windows queue before retrying a timed-out submission; it may already have reached the printer.
- Keep the pairing code private. Disconnect this browser clears its local copy. To revoke all paired browsers, close the desktop app, remove its `runtime/print-pairing-token` file from the app's user-data folder, then reopen and re-pair.
- The helper binds only to 127.0.0.1, validates the exact cloud origin and Host, requires a random 256-bit token, caps job bodies at 10 MiB, and rejects unknown routes. Print windows disallow scripts, network resources and navigation.
- Submitted means accepted by the Windows spooler, not confirmed physical output. Hardware calibration and paper matching remain necessary. The installer is not code-signed.

## Verification

Run `node --test desktop/src/tests/printing.test.mjs` and `npx playwright test --config playwright.stickers.config.ts`. After the browser test generates sticker HTML, run Electron with `desktop/src/tests/printing-render.smoke.mjs` to export actual Chromium PDFs without sending a physical job. Tests use fixture data, not production records.

Implementation references: [Electron print API](https://www.electronjs.org/docs/latest/api/web-contents#contentsprintoptions-callback), [Chrome local-network permission](https://developer.chrome.com/blog/local-network-access).
