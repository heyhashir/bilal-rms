-- Add audited correction reasons to the stock ledger.
ALTER TABLE `inventory_movements`
  MODIFY `reason` ENUM(
    'IMPORT',
    'ADJUSTMENT',
    'ORDER',
    'ORDER_VOID',
    'RETURN',
    'RESTOCK',
    'PURCHASE_VOID',
    'MANUAL',
    'POS_SALE',
    'POS_REFUND',
    'POS_VOID'
  ) NOT NULL;

-- Preserve online-order correction history while allowing reports to exclude voided orders.
ALTER TABLE `orders`
  ADD COLUMN `voidReason` TEXT NULL,
  ADD COLUMN `voidedAt` DATETIME(3) NULL,
  ADD COLUMN `voidedById` VARCHAR(191) NULL;

CREATE INDEX `orders_voidedById_idx` ON `orders`(`voidedById`);

ALTER TABLE `orders`
  ADD CONSTRAINT `orders_voidedById_fkey`
  FOREIGN KEY (`voidedById`) REFERENCES `admin_accounts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Persist the selected product-label layout.
ALTER TABLE `store_settings`
  ADD COLUMN `barcodeLabelTemplate` VARCHAR(191) NOT NULL DEFAULT 'branded';

-- Reverse erroneous stock intake without deleting purchase history.
ALTER TABLE `vendor_purchases`
  ADD COLUMN `reversedAt` DATETIME(3) NULL,
  ADD COLUMN `reversalReason` TEXT NULL,
  ADD COLUMN `reversedById` VARCHAR(191) NULL;

CREATE INDEX `vendor_purchases_reversedById_idx` ON `vendor_purchases`(`reversedById`);

ALTER TABLE `vendor_purchases`
  ADD CONSTRAINT `vendor_purchases_reversedById_fkey`
  FOREIGN KEY (`reversedById`) REFERENCES `admin_accounts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
