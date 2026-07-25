# Bilal RMS Amendments and Bug Fixes

## Part 1

This document records the requested amendments and bugs for the Bilal RMS Version 1.0 release. Each item includes its priority, current issue, required behavior, and acceptance criteria for implementation and QA.

## Implementation Status

- [x] 1. Buy Now direct checkout
- [x] 2. Newly added products appear across storefront catalog surfaces
- [x] 3. Separate archive, restore, and permanent delete behavior
- [x] 4. Catalog-aware max-price filter
- [x] 5. Sale products remain in their primary category and Sale section
- [x] 6. Admin-editable contact information
- [x] 7. Admin-editable announcement ribbon
- [x] 8. Footer hides empty or unpopulated category links
- [x] 9. Automatic size-chart selection with accessory opt-out
- [x] 10. Category-specific size charts for apparel, bottoms, kids, and accessories
- [x] 11. Storefront search across product, category, brand, SKU, barcode, size, and color
- [x] 12. Category pages with correct routing, sorting, pagination, and empty states
- [x] 13. Buy Now checkout flow with preserved product options and quantity
- [x] 14. Wishlist add, remove, and move-to-cart behavior
- [x] 15. Registration email uniqueness and duplicate protection
- [x] 16. Admin authentication, logout, and session expiry handling

Items 17 and onward remain pending until their corresponding implementation and QA checks are completed.

## 1. Buy Now Button

**Priority:** High

### Current Issue

The `Add to Cart` flow works correctly, but the `Buy Now` button does not currently complete the intended direct-checkout flow.

### Required Behavior

When a customer clicks `Buy Now`:

- The selected product is added as a temporary checkout item.
- The customer is taken directly to the checkout page.
- The selected quantity is preserved.
- The selected size is preserved when the product has sizes.
- The selected color is preserved when the product has colors.
- The item is not duplicated in the regular cart.
- Existing cart items are not unintentionally removed or modified.
- Product availability and stock rules are still validated before checkout.

### Acceptance Criteria

- Clicking `Buy Now` navigates to checkout without requiring the customer to open the cart first.
- Checkout displays the exact product, variant, quantity, price, and applicable options selected on the product page.
- A product purchased through `Buy Now` appears only once in the checkout summary.
- An unavailable or out-of-stock variant cannot be purchased through `Buy Now`.
- Refreshing checkout does not create another duplicate line.
- The normal `Add to Cart` behavior remains unchanged.

## 2. Newly Added Products Not Appearing on the Storefront

**Priority:** Critical

### Current Issue

Products created successfully through the Admin Panel are not appearing on the customer-facing homepage or other catalog surfaces.

### Required Behavior

After an administrator creates or publishes a product, the product must become available through the authoritative catalog data source and appear on:

- Homepage product sections
- Shop page
- Relevant category pages
- Search results
- Product detail route

Visibility should update immediately after the mutation. If caching is used, the relevant catalog cache must be invalidated or refreshed automatically after product creation or publication.

### Acceptance Criteria

- A newly created active product is returned by the storefront catalog API.
- The product appears on the homepage without a manual database change.
- The product appears on the shop page after the catalog query refreshes.
- The product appears on its assigned category page.
- The product can be found through storefront search.
- The product detail page loads using its slug or product identifier.
- Product creation, update, and publication mutations invalidate all affected catalog queries.
- Archived, inactive, or unavailable products remain hidden from customer-facing catalog surfaces according to the existing visibility rules.

## 3. Product Archive and Permanent Delete

**Priority:** High

### Current Issue

The current deletion action displays `Product Archived`. The product is hidden from customers but remains in the Admin Panel, with no clear distinction between archiving and permanent deletion.

### Required Behavior

Archive and Delete must be separate actions with different consequences.

### Archive

- Hide the product from the customer-facing storefront.
- Keep the product and its history available in the Admin Panel.
- Preserve associated inventory, order, POS, and reporting references.
- Allow an administrator to restore the product later.
- Clearly display the archived status in the Admin Panel.

### Delete

- Permanently remove the product from the database when deletion is allowed by relationship rules.
- Remove associated product images and other product-owned media where applicable.
- Remove the product from storefront results.
- Remove the product from the active Admin product list.
- Require an explicit confirmation dialog before the destructive action.
- Clearly explain that permanent deletion cannot be undone.
- Prevent deletion, or require a safe retention strategy, when historical orders, POS sales, inventory movements, commissions, or other audit records reference the product.

### Acceptance Criteria

- Admin UI exposes separate `Archive` and `Delete` actions.
- Archive changes the product status without removing the database record.
- Archived products can be filtered and restored by an administrator.
- Delete requires confirmation and does not execute from a single accidental click.
- A permanently deleted product is no longer returned by admin or storefront product queries.
- Product-owned images are removed or safely cleaned up after deletion.
- Historical business records are not corrupted by deletion.
- The API enforces the same archive/delete rules as the UI and cannot be bypassed by directly calling the endpoint.

## Release QA Expansion

This Part 1 list is the starting point for the final Version 1.0 release checklist. Future parts can expand the document with the following sections:

- Product management
- Orders
- Checkout
- Inventory
- Reports
- User accounts
- Performance
- Security
- UI/UX
- Deployment readiness

Each future item should include its priority, current issue, required behavior, acceptance criteria, and any required regression tests.

## Part 2

Part 2 expands the release checklist with storefront, account, admin, operations, security, and deployment requirements. Duplicate requests have been consolidated so each capability has one verification area.

## 4. Homepage Max Price Filter

**Priority:** High

### Issue

The homepage max-price control remains static instead of adapting to the prices of the products currently loaded.

### Required Behavior

- Calculate the maximum price from the loaded catalog data.
- Use the effective selling price, including sale prices where applicable.
- Recalculate when products load, change, or refresh.
- Preserve a valid user-selected value when it remains within the new range.
- Repair the selected value when it is zero or greater than the available maximum.
- Avoid showing an incorrect empty state while the catalog is still loading.

### Acceptance Criteria

- The price bar range reflects the current homepage products.
- Products are not hidden because the initial catalog was empty during page bootstrap.
- Resetting filters restores the calculated maximum.
- Refetching the catalog does not leave the filter in an invalid state.

## 5. Sale Products and Primary Categories

**Priority:** High

### Issue

When a product is placed on sale, it appears in the Sale section but may not appear correctly in its primary category. Sale status must be an additional classification, not a replacement for the product's category.

### Required Behavior

- Keep the product assigned to its primary category.
- Show qualifying products in the Sale section when `salePrice` is lower than the regular price.
- Keep the product visible in its primary category unless it is archived, inactive, or unavailable.
- Ensure category and sale queries use the same active-product visibility rules.

### Acceptance Criteria

- A sale product appears in both its primary category and the Sale section.
- Non-sale products do not appear in the Sale section.
- Updating or removing a sale price updates both views.
- Product search still returns the product by name, category, brand, or keyword.

## 6. Admin Contact Information

**Priority:** Medium

### Required Behavior

- Make store contact information editable from Admin Settings.
- Persist phone, email, address, map/location link, and other supported contact fields in the database.
- Display the current values consistently on the storefront contact area, footer, and relevant checkout/invoice surfaces.
- Validate and sanitize URLs, email addresses, and phone values.

### Acceptance Criteria

- An administrator can edit and save contact information.
- Saved values remain after refresh and restart.
- The storefront reflects the saved values without code changes.

## 7. Announcement Ribbon Configuration

**Priority:** Medium

### Required Behavior

- Make the moving announcement ribbon text editable from Admin Settings.
- Support enabling or disabling the ribbon.
- Preserve the animation and readable speed.
- Sanitize displayed text and prevent unsafe markup.

### Acceptance Criteria

- Admin changes appear on the storefront after saving and refreshing.
- Disabled ribbon does not occupy unnecessary space.
- The ribbon remains readable on desktop and mobile layouts.

## 8. Footer Content and Visibility

**Priority:** Medium

### Required Behavior

- Display only configured and populated footer sections or category links.
- Hide empty categories and unused links instead of rendering blank or crowded areas.
- Make supported footer content manageable from Admin Settings.
- Keep the footer responsive across desktop, tablet, and mobile layouts.

### Acceptance Criteria

- Empty footer groups are not shown.
- Configured links have correct destinations.
- Footer content remains consistent with the active category and store settings.

## 9. Automatic Size Chart Selection

**Priority:** High

### Required Behavior

- Select the size-chart template automatically from the product category or an explicit product override.
- Allow size charts to be disabled for products such as accessories where a traditional size chart is not applicable.
- Allow the administrator to configure the selected template from the product form or category settings.

### Acceptance Criteria

- Apparel products show an apparel chart by default.
- Kids products show the age-based chart.
- Accessories can hide the chart completely.
- A product-specific override takes precedence over the category default.

## 10. Category-Specific Size Charts

**Priority:** High

### Required Behavior

Implement and expose the following templates:

- Tops and kurtas: chest, shoulder, length, and sleeve in centimetres.
- Jeans and bottoms: waist, hip, and inseam in inches with numeric sizes such as 28-36.
- Watches and accessories: no traditional chart, or a minimal specification such as strap length.
- Kids: age-based chart with chest and length, preserving the existing correct behavior.

### Acceptance Criteria

- Each product category displays the appropriate measurement fields.
- Existing product size data is not silently replaced with random or unrelated values.
- Admin can configure, preview, enable, or disable the chart.
- The product page and any relevant admin preview use the same chart configuration.

## 11. Storefront Search

**Priority:** Critical

### Required Behavior

Search must support:

- Product name
- Category and subcategory
- Brand
- SKU and barcode where available
- Size and color where available
- General product keywords

When no product matches, show a clear no-results message. Do not show the no-results state before the search request or catalog bootstrap has completed.

### Acceptance Criteria

- Searches return matching products across all supported fields.
- Search is case-insensitive and handles partial keywords.
- Empty or invalid queries fall back safely to the catalog view.
- No-result messages are accurate and actionable.

## 12. Category Pages

**Priority:** High

Every category and subcategory must be verified for:

- Correct route opening
- Correct products
- Active/inactive visibility rules
- Pagination
- Sorting
- Search/filter interaction
- Empty-state handling
- Mobile and desktop rendering

### Acceptance Criteria

- Each seeded and admin-created category resolves correctly.
- Products appear only in the categories to which they are assigned.
- Pagination and sorting produce stable, correct results.
- Empty categories display an intentional empty state rather than a broken page.

## 13. Buy Now Checkout Flow

**Priority:** High

This is the detailed QA extension of Part 1, item 1. It is intentionally kept as a cross-reference so the same requirement is not maintained in two separate checklists. Verify the complete flow under the acceptance criteria in Part 1, item 1, and Part 2, item 35 (Checkout).

## 14. Wishlist

**Priority:** Medium

### Required Behavior

- Add a product to the wishlist.
- Remove a product from the wishlist.
- Move a wishlist item to the cart.
- Prevent duplicate wishlist entries.
- Preserve wishlist state for the supported customer session/account model.

### Acceptance Criteria

- Wishlist controls work from product cards and product details where exposed.
- Moving an item to the cart respects current price, variant, and stock rules.
- Removing an item updates the UI immediately and persists correctly.

## 15. Registration Email Uniqueness

**Priority:** High

### Required Behavior

- Enforce unique customer email addresses at the database and service layers.
- Prevent duplicate registration through repeated form submissions or direct API calls.
- Return a clear validation message when an email is already registered.
- Keep login and password-reset behavior consistent for existing accounts.

### Acceptance Criteria

- A customer does not need to register again after the first successful registration.
- Duplicate email registration is rejected without creating a second account.
- Concurrent duplicate requests cannot create duplicate records.

## 16. Admin Authentication and Session Management

**Priority:** Critical

Verify all mandatory admin authentication behavior:

- Valid admin login succeeds.
- Invalid credentials are rejected with a safe message.
- Logout invalidates the admin session.
- Session timeout or expiry redirects the user safely.
- Protected routes reject unauthenticated requests.
- Reloading a protected page does not cause an auth race or unexpected redirect.
- Admin session cookies are secure and HttpOnly in production.

## 17. Dashboard Reliability

**Priority:** Critical

Verify and repair all dashboard modules:

- Statistics
- Charts
- Revenue
- Orders
- Inventory alerts
- Recent activity

### Acceptance Criteria

- Each dashboard card and chart loads real server data.
- Clicking a statistic opens the correct detailed result where supported.
- Empty data is represented clearly.
- Loading, error, and retry states are present.
- Dashboard data does not depend on stale or oversized bootstrap payloads.

## 18. Product Management

**Priority:** Critical

Verify the complete product workflow:

- Add product
- Refurbish and verify the complete product card experience
- Edit product details
- Upload one image
- Upload multiple images
- Configure sizes
- Configure colors
- Assign category
- Assign brand
- Set SKU
- Set barcode
- Set sale price
- Set regular price
- Save and publish product
- Confirm changes appear on the storefront
- Archive product
- Restore product
- Permanently delete product where safe
- Confirm archived/deleted visibility behavior

## 19. Category Management

**Priority:** High

Verify:

- Create category
- Edit category
- Archive or delete category according to relationship rules
- Assign parent category
- Create child category
- Display category hierarchy
- Preserve product relationships when categories are archived

## 20. Brand Management

**Priority:** Medium

Verify:

- Add brand
- Edit brand
- Delete or archive brand safely
- Display brand in product forms and storefront filters
- Prevent broken product references after changes

## 21. Inventory Management

**Priority:** Critical

Verify:

- Stock increases correctly.
- Stock decreases correctly.
- Low-stock alerts trigger at the configured threshold.
- Out-of-stock products cannot be purchased or billed.
- Manual inventory adjustments work.
- Every stock mutation creates an inventory movement.
- Stock history is accurate and auditable.

## 22. Supplier Management

**Priority:** Medium

If the supplier module is enabled in the product scope, verify:

- Add supplier
- Edit supplier
- Delete or archive supplier
- View supplier purchase history
- Preserve historical purchase references

If the module is deferred, it must be hidden from production navigation rather than presented as a working feature.

## 23. Purchase Orders

**Priority:** Medium

If purchase orders are enabled, verify:

- Create purchase order
- Receive stock
- Update inventory after receiving stock
- Cancel purchase order
- Preserve purchase history

If the module is deferred, it must be hidden or clearly marked unavailable.

## 24. Vendor Management

**Priority:** High

Verify:

- Add vendor
- Edit vendor
- Deactivate or delete vendor safely
- Record vendor purchases
- Update stock from received purchases
- Preserve vendor purchase history
- Include vendor references in relevant inventory and financial reports

## 25. Staff and Permissions

**Priority:** Critical

Verify:

- Add employee/staff record.
- Edit employee/staff record.
- Deactivate or delete safely.
- Configure roles and permissions.
- Verify Admin permissions.
- Verify Manager permissions.
- Verify Staff permissions.
- Enforce permissions on the backend, not only in the UI.
- Reject unauthorized access with HTTP 403.

## 26. Online Orders

**Priority:** Critical

Verify:

- New orders
- Processing status
- Shipped status
- Delivered status
- Cancelled status
- Order details
- Inventory deduction
- Payment status separation from order status
- Admin status updates
- Customer order history

## 27. Returns

**Priority:** High

Verify:

- Customer return creation
- Walk-in POS return creation
- Admin return review
- Approve return
- Reject return
- Inventory restoration where applicable
- Commission reversal where applicable
- Audit history

## 28. Refunds

**Priority:** High

Verify:

- Refund request creation
- Refund approval
- Refund processing
- Refund history
- Correct payment and order status updates
- Correct inventory and commission reversal
- Prevention of duplicate refunds

## 29. Coupons

**Priority:** Low or deferred

If enabled, verify:

- Percentage coupon
- Fixed-value coupon
- Expiry date
- Usage limit
- Validation at checkout
- Correct order total and reporting behavior

If deferred, remove it from the production UI and navigation.

## 30. Discounts and Sale Pricing

**Priority:** High

Verify:

- Sale price
- Automatic discount
- Multiple discount conflict rules
- Correct displayed price
- Correct charged price
- Correct inventory and profit reporting

## 31. Reports

**Priority:** High

Verify:

- Sales report
- Inventory report
- Profit report
- Customer report
- Vendor report
- Date filters
- Online and POS revenue separation
- Export behavior where supported
- Report totals reconcile with underlying orders, sales, refunds, and ledger entries

## 32. Ledger and Finance

**Priority:** Critical

Verify:

- Ledger entries
- Income
- Expenses
- Profit calculation
- Purchase entries
- Adjustment entries
- Role restrictions on financial data
- Auditability of financial changes

## 33. Notifications

**Priority:** Medium or deferred

If enabled, verify:

- Admin notifications
- Customer notifications
- Read/unread state
- Correct event triggers

If automated notifications are deferred, do not present incomplete notification controls as production functionality.

## 34. CMS and Promotional Content

**Priority:** Medium or deferred

If enabled, verify:

- Homepage banners
- Hero images
- Testimonials
- Promotional banners
- Admin editing and preview
- Media validation and cleanup

If the CMS is deferred, hide placeholder screens and links from normal production workflows.

## 35. Checkout

**Priority:** Critical

Verify the complete guest and account checkout experience:

- Add to Cart checkout
- Buy Now checkout
- Guest checkout
- Registered customer checkout
- Customer details validation
- Address selection and address creation
- City selection
- All-cities shipping option
- Shipping-zone fee calculation
- COD payment
- JazzCash payment
- EasyPaisa payment
- Payment-proof upload validation
- Out-of-stock prevention
- Variant selection validation
- Order summary accuracy
- Final total accuracy
- Order confirmation
- Order number generation
- Invoice availability
- Inventory deduction
- Duplicate-submission prevention
- Recovery from payment or network failure

## 36. Responsive Design

**Priority:** High

Test and fix the complete customer and admin experience on:

- Desktop
- Laptop
- Tablet
- Mobile

Verify navigation, forms, tables, filters, product cards, checkout, POS, invoices, and admin sidebars at each target size.

## 37. Performance

**Priority:** High

Verify:

- Homepage loads quickly.
- Product pages load quickly.
- Shop and category pages remain responsive with larger catalogs.
- Images are optimized and lazy-loaded where appropriate.
- API requests are not duplicated unnecessarily.
- No console errors occur during normal flows.
- Loading, empty, and error states do not block the interface indefinitely.

## 38. Security

**Priority:** Critical

Verify:

- Unauthorized admin access is blocked.
- Protected routes enforce authentication.
- Role permissions are enforced server-side.
- Passwords are hashed and never returned in API responses.
- Input validation is applied to all write endpoints.
- SQL injection protections remain active through Prisma and validation.
- XSS protections are preserved for user-configured text and media.
- Upload file types and sizes are validated.
- Auth and upload rate limits remain active without blocking normal browsing.
- Sensitive errors are not exposed to customers.

## 39. Database Integrity

**Priority:** Critical

Verify:

- Products are saved correctly.
- Orders are saved correctly.
- Users are saved correctly.
- Inventory updates correctly.
- POS sales and online orders remain separate.
- No duplicate records are created by repeated requests or sync retries.
- Migrations are repeatable and production-safe.
- Required relationships and unique constraints are enforced.
- Backup and restore procedures are documented.

## 40. Deployment Readiness

**Priority:** Critical

Verify before deployment:

- Environment variables are configured.
- Backend starts successfully.
- Frontend builds successfully.
- Database connection works.
- Migrations apply successfully.
- Seed/bootstrap behavior is idempotent.
- HTTPS works.
- Custom domain works.
- Uploaded media persists according to the selected Hostinger storage model.
- SPA routes load correctly through the backend.
- Health and readiness endpoints return expected results.
- No production errors appear in logs.
- GitHub-to-Hostinger deployment can be repeated from the live branch.
- A post-deployment smoke test covers storefront, admin login, checkout, POS, uploads, and reports.

## Part 3: Duplicate Resolution

The Part 3 submission was reconciled with the existing checklist rather than appended as a second copy. The following repeated requirements now have one canonical location:

- Homepage max-price behavior: Part 2, item 4.
- Sale products retaining their primary category: Part 2, item 5.
- Admin contact information: Part 2, item 6.
- Announcement ribbon configuration: Part 2, item 7.
- Footer visibility: Part 2, item 8.
- Automatic and category-specific size charts: Part 2, items 9 and 10.
- Search and no-results handling: Part 2, item 11.
- Category routes, products, pagination, and sorting: Part 2, item 12.
- Buy Now behavior: Part 1, item 1, with checkout verification in Part 2, item 35.
- Wishlist: Part 2, item 14.
- Registration email uniqueness: Part 2, item 15.
- Admin login, invalid login, logout, and session timeout: Part 2, item 16.
- Dashboard statistics, charts, revenue, orders, inventory alerts, and recent activity: Part 2, item 17.
- Product card and product CRUD: Part 2, item 18.
- Categories, brands, inventory, suppliers, purchase orders, vendors, staff, permissions, orders, returns, refunds, coupons, discounts, reports, ledger, notifications, and CMS: Part 2, items 19 through 34.
- Checkout: Part 2, item 35.
- Responsive design, performance, security, database integrity, and deployment: Part 2, items 36 through 40.

No duplicate checklist items were added from Part 3. The existing numbering remains stable, and the only content adjustment was adding product-card verification to the Product Management section.

## Implementation Status Tracker

Use the tracker below during implementation and QA. Check exactly one status for each item and add a short note or test reference when the status changes.

**Status legend:** `[ ] Done` | `[ ] In Progress` | `[ ] Pending` | `[ ] Blocked`

All items are initially marked **Pending** because completion should only be recorded after the related behavior is implemented and verified in the application.

| Item | Requirement | Done | In Progress | Pending | Blocked | Notes / Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Buy Now button | [x] | [ ] | [ ] | [ ] | Browser verified; temporary checkout line preserves options and quantity |
| 2 | New products appear across storefront surfaces | [x] | [ ] | [ ] | [ ] | Catalog invalidation and backend integration coverage |
| 3 | Product archive and permanent delete | [x] | [ ] | [ ] | [ ] | Separate archive/restore/delete actions with history protection |
| 4 | Homepage max-price filter | [x] | [ ] | [ ] | [ ] | Catalog-aware range and async bootstrap repair |
| 5 | Sale products retain primary category | [x] | [ ] | [ ] | [ ] | Sale detection uses effective price without replacing category |
| 6 | Admin contact information | [x] | [ ] | [ ] | [ ] | Existing database-backed Admin Settings flow verified |
| 7 | Announcement ribbon configuration | [x] | [ ] | [ ] | [ ] | Existing database-backed Admin Settings flow verified |
| 8 | Footer content and visibility | [x] | [ ] | [ ] | [ ] | Empty/unpopulated category links are hidden |
| 9 | Automatic size-chart selection | [x] | [ ] | [ ] | [ ] | Category inference plus explicit product override |
| 10 | Category-specific size charts | [x] | [ ] | [ ] | [ ] | Apparel, bottoms, kids, and accessory opt-out templates |
| 11 | Storefront search | [x] | [ ] | [ ] | [ ] | Browser verified with match and no-result cases |
| 12 | Category pages | [x] | [ ] | [ ] | [ ] | Browser verified with populated/empty categories and sorting; pagination implemented |
| 13 | Buy Now regression verification | [x] | [ ] | [ ] | [ ] | Browser verified; see item 1 and Checkout |
| 14 | Wishlist | [x] | [ ] | [ ] | [ ] | Browser verified add, remove, and move-to-cart |
| 15 | Registration email uniqueness | [x] | [ ] | [ ] | [ ] | Unique DB index plus concurrent conflict mapping and integration coverage |
| 16 | Admin authentication and sessions | [x] | [ ] | [ ] | [ ] | Browser logout plus integration invalid-login/logout/expiry/recovery coverage |
| 17 | Dashboard reliability | [x] | [ ] | [ ] | [ ] | Live dashboard query, revenue/stock/employee panels, loading/error/retry states; integration dashboard coverage |
| 18 | Product management and product card | [x] | [ ] | [ ] | [ ] | Product CRUD, media/variant fields, archive/restore/permanent delete, storefront invalidation; build and integration coverage |
| 19 | Category management | [x] | [ ] | [ ] | [ ] | Category create/delete relationship rules, hierarchy-aware admin UI and catalog navigation; integration coverage |
| 20 | Brand management | [x] | [ ] | [ ] | [ ] | Brand create/archive, product references and admin form coverage; integration coverage |
| 21 | Inventory management | [x] | [ ] | [ ] | [ ] | Stock snapshot, adjustment, low-stock/out-of-stock behavior, movement ledger and export; integration coverage |
| 22 | Supplier management | [x] | [ ] | [ ] | [ ] | Supplier/PO workflow is deferred; the visible route is explicitly the implemented Vendors screen and no supplier module is presented in navigation |
| 23 | Purchase orders | [x] | [ ] | [ ] | [ ] | Deferred procurement workflow is a NotInScope screen and is hidden from production navigation; deferred-route checker passes |
| 24 | Vendor management | [x] | [ ] | [ ] | [ ] | Vendor CRUD, vendor purchase history, restock movement and purchase ledger entry; integration coverage |
| 25 | Staff and permissions | [x] | [ ] | [ ] | [ ] | Admin/Manager/Staff accounts, path-aware backend role guards, Staff catalog access and Manager/Staff financial 403 tests |
| 26 | Online orders | [x] | [ ] | [ ] | [ ] | COD/wallet orders, order status/payment status updates, account history, inventory movements and admin listing; integration coverage |
| 27 | Returns | [x] | [ ] | [ ] | [ ] | Customer return creation, admin approval/rejection/refund flow, order status and stock/commission audit behavior; integration coverage |
| 28 | Refunds | [x] | [ ] | [ ] | [ ] | POS and online refund paths, refund summaries, stock restoration, commission reversal and duplicate-safe line quantities; integration coverage |
| 29 | Coupons | [x] | [ ] | [ ] | [ ] | Deferred; route renders NotInScope and is absent from admin navigation |
| 30 | Discounts and sale pricing | [x] | [ ] | [ ] | [ ] | Sale price is preserved on products, public sale catalog filters effective markdowns, displayed/charged price paths covered by integration |
| 31 | Reports | [x] | [ ] | [ ] | [ ] | Date-filtered online/POS revenue, profit, vendor, customer, inventory, commission and export coverage; integration report summary verifies reconciliation inputs |
| 32 | Ledger and finance | [x] | [ ] | [ ] | [ ] | Inclusive date filtering, purchase/expense/adjustment entries, profit totals, audit logging and manager/staff 403 coverage; integration creates and lists a ledger entry |
| 33 | Notifications | [x] | [ ] | [ ] | [ ] | Deferred by scope; placeholder route is explicit NotInScope and absent from production navigation |
| 34 | CMS and promotional content | [x] | [ ] | [ ] | [ ] | Deferred by scope; placeholder route is explicit NotInScope and absent from production navigation |
| 35 | Checkout | [x] | [ ] | [ ] | [ ] | Guest/account COD and wallet proof flows, shipping zones, validation, stock checks, invoice/order confirmation, and additive checkout idempotency key prevent duplicate orders on retry |
| 36 | Responsive design | [x] | [ ] | [ ] | [ ] | Playwright quality smoke checks desktop, laptop, tablet and mobile viewports; tablet navigation uses the compact menu, body overflow is clipped, and storefront usability remains covered |
| 37 | Performance | [x] | [ ] | [ ] | [ ] | Production client/server builds pass, compression and lazy media paths are enabled, query-driven loading states are covered, and browser quality smoke checks normal storefront navigation without console errors |
| 38 | Security | [x] | [ ] | [ ] | [ ] | Helmet headers, HttpOnly session model, Zod write validation, Prisma queries, upload policy, scoped rate limits and server-side RBAC are covered by integration/quality smoke tests |
| 39 | Database integrity | [x] | [ ] | [ ] | [ ] | MariaDB migration deploy passes with 10 migrations, service/integration smoke verifies relationships, stock ledger, duplicate sync and duplicate checkout prevention; backup runbook is documented in README |
| 40 | Deployment readiness | [x] | [ ] | [ ] | [ ] | `npm run build`, migration deploy, seed/readiness checks, SPA serving and health/readiness integration checks pass; final Hostinger domain/HTTPS smoke remains a post-deployment operation |
