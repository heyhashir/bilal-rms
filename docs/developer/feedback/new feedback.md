# BALY RMS - Final Production Feedback

## Document Purpose

This document consolidates the final client feedback for the BALY by Bilal
Garments EST 2001 Retail Management System. It replaces the duplicated and
partially conflicting notes previously stored in this file.

The production-blocking work is grouped into four areas:

1. Receipt and invoice management
2. Variant inventory management
3. Product barcode sticker printing
4. Invoice cancellation and financial correction

All existing billing, inventory, reporting, commission, return, refund, and
audit behavior must remain intact unless this document explicitly changes it.

## Local Implementation Status

Implementation and automated verification were completed locally on
2026-07-28. Checked items below have passing code-level or browser-level
evidence. Unchecked items require the client's physical receipt printer,
sticker printer, barcode scanner, or final mobile-device acceptance. Nothing
from this implementation pass has been deployed.

## Reference Files

| File | Purpose | Required interpretation |
| --- | --- | --- |
| `curent recipt.jpeg` | Current system output | Shows the existing receipt/refund view that must be replaced or separated from the official printable receipt. |
| `expected recipt.jpeg` | Approved receipt design | This is the visual reference for the final customer receipt. Preserve its information hierarchy, alignment, separators, totals, barcode area, and policy footer. |
| `size chart.jpeg` | Variant stock matrix | Confirms that sizes must appear as rows and colors must appear as columns. Each cell stores stock for one size-color combination. |
| `tag.jpeg` | Existing physical sticker | Reference for readable product name, size, price, barcode, and barcode number placement. |
| `tag with sizing.jpeg` | BALY sticker mockup | Reference for branding and product information. The required print orientation is landscape: 1.50 inches wide x 1.00 inch high. The dimension arrows in the mockup appear swapped, so the written dimensions take precedence. |

---

# 1. Receipt and Invoice Module

**Priority:** Critical - production blocking

## 1.1 Problem

The current receipt is functional but is not suitable as the official
customer-facing sales receipt. It lacks the approved layout, structured invoice
numbering, complete price information, configurable store content, reliable
barcode retrieval, and a clear reprint/search workflow.

The refund interface shown in `curent recipt.jpeg` must not be used as the final
receipt design.

## 1.2 Approved Design

Use `expected recipt.jpeg` as the approved visual reference.

- Do not independently redesign the receipt.
- Preserve its typography hierarchy, spacing, alignment, separators, totals
  section, barcode area, and footer structure as closely as the target printer
  permits.
- Support the configured thermal receipt printer.
- Support browser printing and PDF export.
- PDF/A4 export may place the approved receipt on an A4 page, but must not alter
  receipt data or reorder its sections.

## 1.3 Configurable Header

The following values must be editable from Admin Settings without code changes:

- Store name
- Store address
- Contact number
- Store logo, optional
- Tax number, optional

Default content:

```text
BALY by Bilal Garments EST 2001
PLeader Lane, Attock
0333-5949229
```

Settings changes apply to newly generated receipts. Historical receipts and
reprints must continue to display the original saved snapshot.

## 1.4 Receipt Identification

Every finalized sale must store and display:

- Invoice number
- Globally unique receipt ID
- Sale date
- Sale time
- Associate/cashier
- Payment method
- Customer name, with `Walk-in Customer` as the default where applicable

Invoice numbers use a letter prefix followed by six digits:

```text
A000001
A000002
...
A999999
B000001
...
```

Requirements:

- Invoice numbers must be unique.
- Receipt IDs must be globally unique.
- Number generation must be concurrency-safe.
- Reprints must reuse the original invoice number and receipt ID.
- Voided or refunded invoices must never release their identifiers for reuse.

## 1.5 Product Table

The printable product table must contain:

| Column | Meaning |
| --- | --- |
| Item | Product name plus selected size/color where applicable |
| Qty | Purchased quantity |
| Retail Price | Original selling price at the time of sale |
| Discounted Price | Actual unit price charged after discount |
| Subtotal | Discounted Price x Qty |

The generic `Unit Price` column must be removed.

All values must be stored as sale-time snapshots. Later product price changes
must not change historical receipts.

## 1.6 Totals

Calculate and display:

- Total items
- Subtotal
- Discount
- Grand total
- Cash received
- Change returned

Rules:

- Monetary calculations must use decimal-safe arithmetic.
- The item subtotals, order subtotal, discount, and grand total must reconcile.
- Cash received and change are required for cash payments.
- Non-cash payment methods must not show misleading cash/change values.

## 1.7 Receipt Barcode

Generate the receipt barcode from the globally unique receipt ID.

Example:

```text
MB19262C-U70C
```

The barcode must:

- Print at high contrast.
- Include sufficient left and right quiet zones.
- Never overlap text or separators.
- Show the human-readable receipt ID below it.
- Scan reliably using a keyboard-wedge barcode scanner.
- Resolve to exactly one invoice.

## 1.8 Invoice Search and Retrieval

Staff must be able to retrieve an invoice by:

1. Invoice number
2. Receipt ID
3. Scanning the receipt barcode

Search behavior:

- Exact matches open the complete transaction immediately.
- Barcode scanner input followed by Enter triggers lookup automatically.
- Invalid values show a clear `Invoice not found` message.
- Search must not return an unrelated partial match.

The retrieved transaction must show:

- Customer information
- Products
- Size
- Color
- Quantity
- Retail and charged prices
- Discount
- Payment method
- Associate/cashier
- Transaction status
- Return, refund, cancellation, and reprint history

This transaction view is the entry point for returns, refunds, exchanges when
implemented, reprints, and administrator cancellation.

## 1.9 Configurable Footer

The following receipt footer content must be editable from Admin Settings:

- Thank-you message
- Guarantee policy
- Exchange policy
- Return policy
- Sale-item policy
- Additional notes

Default example:

```text
Thank you for shopping with us!

Guarantee:
Due items will be replaced within 2 days.

Sale items are non-returnable and non-exchangeable.
Please keep this receipt for exchange or warranty.
No Return - No Exchange on Sale Items
```

No customer-facing policy text may be hard-coded in the receipt component.
Historical reprints must use the footer snapshot stored with the original sale.

## 1.10 Print, PDF, and Reprint

Support:

- Print new receipt
- Download/export PDF
- Reprint an existing receipt

Every reprint must preserve the original:

- Invoice number and receipt ID
- Date and time
- Products and variants
- Prices and discounts
- Payment details
- Customer and associate
- Header/footer snapshots
- Barcode

Record reprint count and timestamp for audit purposes. A reprint must never
create a new sale, stock movement, commission, or ledger entry.

## 1.11 Receipt Acceptance Checklist

- [x] Approved receipt hierarchy and layout are preserved.
- [x] Header fields are configurable in Admin Settings.
- [x] Footer fields are configurable in Admin Settings.
- [x] Invoice numbering is unique and concurrency-safe.
- [x] Receipt IDs are globally unique.
- [x] Retail price, discounted price, and subtotal are correct.
- [x] Totals reconcile with sale items and payment.
- [ ] Receipt barcode prints and scans reliably.
- [x] Invoice lookup works by invoice number.
- [x] Invoice lookup works by receipt ID.
- [x] Invoice lookup works by barcode scanner.
- [x] Browser print is validated.
- [x] PDF export is validated.
- [ ] Mobile PDF output is readable.
- [ ] Thermal printer output is validated.
- [x] Reprints match the original transaction exactly.
- [x] Reprints cause no duplicate financial or inventory records.

---

# 2. Variant Product and Inventory Matrix

**Priority:** Critical - production blocking

## 2.1 Problem

Variant products are currently unusable for the client's garment workflow.
Selecting Variant Product can result in zero stock without providing a complete
way to define sizes, colors, and stock for each combination.

## 2.2 Product Modes

### Simple Product

- Keep the existing single-stock workflow.
- The administrator enters one stock quantity.
- No variant matrix is required.

### Variant Product

- Stop using the simple product stock field as the source of truth.
- Open or reveal a Variant Configuration interface.
- Do not reset existing stock merely because Variant Product was selected.
- Stock is stored per generated size-color variant.
- Displayed total product stock is derived from the sum of active variants.

## 2.3 Variant Configuration

The administrator must be able to add, edit, and remove:

- Sizes, for example `28`, `30`, `32`, `34`, `36`
- Colors, for example `Black`, `Red`, `Blue`, `Green`, `White`

After entering sizes and colors, `Generate Matrix` creates every required
combination.

The matrix orientation is fixed:

- Sizes are rows.
- Colors are columns.
- Each cell is an editable stock quantity.

Example:

| Size | Black | Red | Blue | Green |
| --- | ---: | ---: | ---: | ---: |
| 28 | 5 | 4 | 2 | 0 |
| 30 | 8 | 3 | 5 | 1 |
| 32 | 4 | 6 | 0 | 2 |

## 2.4 Variant Data Rules

Every size-color combination must have:

- Independent stock
- Unique SKU
- Unique barcode
- Independent inventory movement history
- Optional variant-specific price/cost where supported

Example SKUs:

```text
FB1338-BLK-28
FB1338-RED-28
FB1338-BLK-30
```

Rules:

- Duplicate size-color combinations are not allowed.
- Duplicate SKUs or barcodes are not allowed.
- Matrix regeneration must preserve matching existing variants and stock.
- Removing a variant with history must archive it rather than destroy its audit
  records.
- Saving a product and its variant matrix must be transactional.

## 2.5 Storefront Behavior

- Customers select color and size.
- Only valid combinations are selectable.
- Out-of-stock combinations are disabled or visibly marked.
- Changing color updates available sizes, and changing size updates available
  colors.
- Add to Cart and Buy Now preserve the exact variant.

## 2.6 POS Behavior

- Scanning a variant barcode identifies the exact product, size, and color.
- Manual product selection requires the cashier to select a valid variant.
- Finalizing a sale decrements only the selected variant.
- Returns restore only the returned variant.
- Other variants remain unchanged.

## 2.7 Variant Acceptance Checklist

- [x] Selecting Variant Product does not incorrectly reset stock.
- [x] Variant configuration opens or becomes visible immediately.
- [x] Sizes can be added, edited, and removed.
- [x] Colors can be added, edited, and removed.
- [x] Matrix uses sizes as rows and colors as columns.
- [x] Generate Matrix creates all size-color combinations.
- [x] Existing matching variants survive matrix regeneration.
- [x] Each variant has independent stock, SKU, and barcode.
- [x] Storefront availability follows variant stock.
- [x] Cart and Buy Now preserve the selected variant.
- [x] POS scan resolves the exact variant.
- [x] Sale deduction affects only the sold variant.
- [x] Return/refund restoration affects only the returned variant.
- [x] Simple products continue to work unchanged.

---

# 3. Product Barcode Sticker Printing

**Priority:** Critical - production blocking

## 3.1 Problem

The application can generate barcode values, but printing them on a generic page
does not produce a reliable physical product label. The system needs a dedicated
sticker workflow with exact sizing, preview, bulk quantities, and variant-aware
barcodes.

## 3.2 Sticker Size and Orientation

The production label is:

- Width: 1.50 inches
- Height: 1.00 inch
- Orientation: landscape
- Print scale: 100 percent
- One sticker per physical label

Use `tag.jpeg` for the practical information hierarchy and
`tag with sizing.jpeg` for BALY branding. The sizing arrows in the mockup appear
reversed; the written 1.50-inch width x 1.00-inch height requirement is
authoritative.

## 3.3 Sticker Actions

Provide `Print Barcode Sticker`:

- On Product Details
- In Inventory Management
- After product creation
- After adding stock

Provide `Print All Stickers` for stock-based bulk printing.

## 3.4 Preview

Opening the print action must show a preview that matches the actual printed
label.

The sticker displays:

- BALY by Bilal Garments EST 2001
- Product name
- Product code/SKU
- Size, for variants
- Color, for variants
- Selling price
- Barcode
- Human-readable barcode value

Hide size and color cleanly for simple products; do not print empty labels.

## 3.5 Product and Variant Rules

- Every simple product has its own unique SKU and barcode.
- Every variant has its own unique SKU and barcode.
- A variant sticker must identify the exact size-color combination.
- Scanning adds or opens that exact variant in POS.
- Existing barcode-generation conventions remain the source of barcode values.

## 3.6 Bulk Printing

Bulk printing defaults to one label per unit currently in stock.

Example:

| Variant | Stock | Labels |
| --- | ---: | ---: |
| Black / 28 | 5 | 5 |
| Red / 28 | 4 | 4 |
| Black / 30 | 3 | 3 |

Requirements:

- Allow a custom label quantity before printing.
- Never generate a negative quantity.
- Out-of-stock variants default to zero labels.
- Print jobs must show the total label count before confirmation.
- Bulk printing must not alter inventory.

## 3.7 Print and Scan Quality

- Use high-contrast black bars on a white background.
- Preserve barcode quiet zones.
- Do not allow text or graphics to overlap the barcode.
- Use print CSS with exact physical dimensions.
- Remove browser headers and footers where supported.
- Prevent automatic fit-to-page scaling.
- Keep the human-readable barcode value legible.
- Validate with the client's actual printer and scanner before production sign-off.

## 3.8 Sticker Acceptance Checklist

- [x] Print Barcode Sticker is available in all required workflows.
- [ ] Print preview matches physical output.
- [x] Label print CSS is fixed at 1.50 x 1.00 inches in landscape.
- [x] Simple product labels show the correct product data.
- [x] Variant labels show the correct size and color.
- [x] Each SKU and barcode is unique.
- [x] Bulk count defaults to available stock.
- [x] Custom print quantity is supported.
- [x] Bulk printing does not change inventory.
- [x] Barcode resolves to the exact product/variant in software tests.
- [x] Scanner-style input adds the correct variant to POS.
- [ ] Physical printer alignment and scanner reliability are validated.

---

# 4. Invoice Cancellation and Financial Correction

**Priority:** Critical - data integrity and production blocking

## 4.1 Problem

Test or incorrect invoices currently remain recorded as real revenue. They can
affect:

- Dashboard revenue
- Sales and profit reports
- Inventory
- Employee commissions
- Ledger/accounting totals
- Recent activity

Invoices must not be deleted or edited directly because the system is hosted and
requires an audit trail.

## 4.2 Required Solution

Add an Administrator-only `Cancel/Void Invoice` action.

Cancellation must:

- Preserve the original invoice.
- Mark it `CANCELLED` or `VOID`.
- Require a reason.
- Record who performed the action and when.
- Prevent a second cancellation.
- Reverse all effects in one database transaction.

## 4.3 Transactional Rollback

For a valid cancellation, the system must:

- Restore stock to the exact simple product or variant.
- Create compensating inventory movements.
- Exclude the sale from active revenue and profit totals.
- Create compensating ledger entries where applicable.
- Reverse associated employee commissions.
- Update dashboard statistics and reports.
- Preserve the original payment and receipt records for audit.
- Record the cancellation in transaction history.

The original records must not be physically deleted.

## 4.4 Returns, Refunds, and Cancellation

These operations must remain distinct:

- **Cancellation/Void:** reverses an incorrect or test invoice as a whole.
- **Return:** records returned merchandise and restores eligible stock.
- **Refund:** records money returned to the customer.
- **Exchange:** uses the retrieved invoice as the starting point and must be
  implemented as explicit return/new-sale movements rather than editing history.

A completed refund or return must not be cancellable in a way that restores stock
or reverses revenue twice. The service must enforce valid status transitions.

## 4.5 Revenue Adjustments

Dashboard revenue must never be manually overwritten.

Use:

- Invoice cancellation for fake or incorrect sales.
- Return/refund workflows for customer reversals.
- Audited ledger adjustment entries for non-sale financial corrections.

Every correction requires:

- Amount
- Reason
- Administrator identity
- Timestamp
- Reference to the affected transaction where applicable

## 4.6 Cancellation Acceptance Checklist

- [x] Only an administrator can cancel an invoice.
- [x] Cancellation requires confirmation and a reason.
- [x] Original invoice remains available and is marked cancelled/void.
- [x] Stock is restored exactly once.
- [x] Compensating inventory movements are created.
- [x] Revenue and profit are corrected.
- [x] Ledger effects are reversed or compensated.
- [x] Employee commissions are reversed.
- [x] Dashboard and reports update correctly.
- [x] Cancellation appears in transaction history.
- [x] Duplicate cancellation is rejected.
- [x] Invalid status transitions are rejected.
- [x] Returns/refunds cannot cause a double reversal.
- [x] Concurrent cancellation attempts remain idempotent.

---

# 5. Required Validation

## Automated Tests

- [x] Receipt numbering uniqueness and rollover
- [x] Receipt ID uniqueness
- [x] Receipt calculation and discount reconciliation
- [x] Search by invoice number and receipt ID
- [x] Scanner-style lookup ending with Enter
- [x] Historical reprint immutability
- [x] Reprint creates no duplicate business records
- [x] Variant matrix generation and regeneration
- [x] Variant SKU/barcode uniqueness
- [x] Variant-specific stock sale and restoration
- [x] Bulk sticker label counts
- [x] Cancellation authorization
- [x] Cancellation transaction rollback
- [x] Commission reversal
- [x] Ledger correction
- [x] Duplicate and concurrent cancellation idempotency

## Manual Hardware Tests

- [ ] Thermal receipt printer dimensions and alignment
- [ ] Product sticker printer at 1.50 x 1.00 inches
- [ ] Receipt barcode scanning
- [ ] Product and variant barcode scanning
- [ ] Bulk label feed/alignment
- [ ] Reprint consistency on physical paper

## Regression Tests

- [x] Simple products
- [x] Online checkout
- [x] POS billing
- [x] Inventory adjustments
- [x] Returns and refunds
- [x] Dashboard metrics
- [x] Sales, profit, and commission reports
- [x] Admin permissions
- [x] Existing product barcode generation

---

# 6. Definition of Done

This feedback package is complete only when:

- All four critical modules meet their acceptance checklists.
- No sale, cancellation, return, or refund can corrupt inventory or financial
  reporting.
- Historical invoices remain immutable and auditable.
- Variant inventory works independently for every size-color combination.
- Receipt and product barcodes scan to the correct records.
- Receipt and sticker layouts pass physical printer testing.
- Automated regression tests pass.
- No production-blocking defect remains.

---

# 7. Local Implementation and Verification Record

## 7.1 Scope Status

The software implementation described in this document is complete in the local
working copy. Nothing from this implementation pass has been deployed, pushed,
or committed.

The only incomplete acceptance items are the physical printer and scanner tests
listed in **Manual Hardware Tests**. Those checks require the target thermal
receipt printer, 1.50 x 1.00 inch label printer/media, and barcode scanner.

## 7.2 Verification Results

Verified locally on 28 July 2026:

- [x] Production client and backend build
- [x] Prisma schema validation
- [x] MariaDB migration deployment and seed
- [x] Frontend ESLint
- [x] Backend ESLint
- [x] Backend service smoke suite
- [x] Backend API integration suite
- [x] Product import smoke suite
- [x] Desktop local SQLite smoke suite
- [x] Route architecture check
- [x] Deferred admin route check
- [x] Live-safe Playwright browser regression
- [x] Electron unpacked application packaging
- [x] Windows NSIS installer generation

The browser regression completed successfully with the production-built app and
covered product/variant management, barcode-label preview, POS billing, exact
invoice lookup, receipt rendering, browser printing, PDF generation, commission
reporting, and Administrator-only invoice void/reversal.

## 7.3 Generated Local Artifact

Windows installer:

`desktop/dist/BilalRMS-Setup-0.2.6.exe`

Generated size: approximately 100.3 MB.

## 7.4 Release Boundary

The implementation is software-ready for the next acceptance stage, but final
hardware approval must not be claimed until all unchecked Manual Hardware Tests
pass on the client’s actual printer, paper/labels, and scanner.
