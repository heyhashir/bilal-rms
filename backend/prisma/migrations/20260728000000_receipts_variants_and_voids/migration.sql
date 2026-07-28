-- Extend the inventory ledger with explicit POS invoice void movements.
ALTER TABLE `inventory_movements`
  MODIFY `reason` ENUM(
    'IMPORT',
    'ADJUSTMENT',
    'ORDER',
    'RETURN',
    'RESTOCK',
    'MANUAL',
    'POS_SALE',
    'POS_REFUND',
    'POS_VOID'
  ) NOT NULL;

-- Preserve sale-time retail totals, discounts, cash change, and void audit data.
ALTER TABLE `pos_sales`
  ADD COLUMN `retailSubtotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `discountTotal` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `changeAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0,
  ADD COLUMN `voidReason` TEXT NULL,
  ADD COLUMN `voidedAt` DATETIME(3) NULL,
  ADD COLUMN `voidedById` VARCHAR(191) NULL;

UPDATE `pos_sales`
SET `retailSubtotal` = `subtotal`
WHERE `retailSubtotal` = 0;

ALTER TABLE `pos_sale_items`
  ADD COLUMN `retailPrice` DECIMAL(10, 2) NOT NULL DEFAULT 0;

UPDATE `pos_sale_items`
SET `retailPrice` = `unitPrice`
WHERE `retailPrice` = 0;

-- Store immutable receipt settings and a concurrency-safe invoice sequence.
ALTER TABLE `receipts`
  ADD COLUMN `invoiceSequence` INTEGER NULL,
  ADD COLUMN `documentSnapshot` JSON NULL;

CREATE UNIQUE INDEX `receipts_invoiceSequence_key`
  ON `receipts`(`invoiceSequence`);

CREATE TABLE `document_sequences` (
  `id` VARCHAR(191) NOT NULL,
  `nextValue` INTEGER NOT NULL DEFAULT 1,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Make receipt header and policy content editable without changing historical copies.
ALTER TABLE `store_settings`
  ADD COLUMN `taxNumber` VARCHAR(191) NULL,
  ADD COLUMN `receiptLogoPath` VARCHAR(191) NULL,
  ADD COLUMN `receiptThankYou` VARCHAR(191) NOT NULL DEFAULT 'Thank you for shopping with us!',
  ADD COLUMN `guaranteePolicy` TEXT NOT NULL DEFAULT 'Due items will be replaced within 2 days.',
  ADD COLUMN `exchangePolicy` TEXT NOT NULL,
  ADD COLUMN `returnPolicy` TEXT NOT NULL,
  ADD COLUMN `saleItemPolicy` TEXT NOT NULL DEFAULT 'No Return - No Exchange on Sale Items',
  ADD COLUMN `receiptNotes` TEXT NOT NULL DEFAULT 'Please keep this receipt for exchange or warranty.';

CREATE INDEX `pos_sales_voidedById_idx` ON `pos_sales`(`voidedById`);

ALTER TABLE `pos_sales`
  ADD CONSTRAINT `pos_sales_voidedById_fkey`
  FOREIGN KEY (`voidedById`) REFERENCES `admin_accounts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
