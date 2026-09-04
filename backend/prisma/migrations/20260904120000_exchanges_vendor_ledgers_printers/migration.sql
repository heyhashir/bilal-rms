ALTER TABLE `commission_entries`
  MODIFY `status` ENUM('EARNED', 'REVERSED', 'PAID', 'CANCELLED') NOT NULL DEFAULT 'EARNED',
  ADD COLUMN `cancelledAmount` DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE `receipts`
  ADD COLUMN `lookupCode` VARCHAR(191) NULL;

UPDATE `receipts`
SET `lookupCode` = CONCAT('BI-', LPAD(UPPER(CONV(`invoiceSequence`, 10, 36)), 4, '0'))
WHERE `invoiceSequence` IS NOT NULL AND `invoiceSequence` <= 1679615;

CREATE UNIQUE INDEX `receipts_lookupCode_key` ON `receipts`(`lookupCode`);

ALTER TABLE `ledger_entries`
  ADD COLUMN `vendorId` VARCHAR(191) NULL;

UPDATE `ledger_entries` AS ledger
INNER JOIN `vendor_purchases` AS purchase ON purchase.`id` = ledger.`vendorPurchaseId`
SET ledger.`vendorId` = purchase.`vendorId`
WHERE ledger.`vendorId` IS NULL;

CREATE INDEX `ledger_entries_vendorId_idx` ON `ledger_entries`(`vendorId`);
ALTER TABLE `ledger_entries`
  ADD CONSTRAINT `ledger_entries_vendorId_fkey`
  FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE `pos_exchanges` (
  `id` VARCHAR(191) NOT NULL,
  `exchangeNumber` VARCHAR(191) NOT NULL,
  `idempotencyKey` VARCHAR(191) NOT NULL,
  `sourceSaleId` VARCHAR(191) NOT NULL,
  `replacementSaleId` VARCHAR(191) NOT NULL,
  `returnedValue` DECIMAL(10, 2) NOT NULL,
  `replacementValue` DECIMAL(10, 2) NOT NULL,
  `settlementDirection` ENUM('COLLECT', 'REFUND', 'EVEN') NOT NULL,
  `settlementAmount` DECIMAL(10, 2) NOT NULL,
  `settlementMethod` ENUM('CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER') NULL,
  `reason` VARCHAR(191) NOT NULL,
  `note` TEXT NOT NULL,
  `operatorId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE UNIQUE INDEX `pos_exchanges_exchangeNumber_key` ON `pos_exchanges`(`exchangeNumber`);
CREATE UNIQUE INDEX `pos_exchanges_idempotencyKey_key` ON `pos_exchanges`(`idempotencyKey`);
CREATE UNIQUE INDEX `pos_exchanges_replacementSaleId_key` ON `pos_exchanges`(`replacementSaleId`);
CREATE INDEX `pos_exchanges_sourceSaleId_idx` ON `pos_exchanges`(`sourceSaleId`);
CREATE INDEX `pos_exchanges_operatorId_idx` ON `pos_exchanges`(`operatorId`);

ALTER TABLE `pos_returns` ADD COLUMN `exchangeId` VARCHAR(191) NULL;
CREATE INDEX `pos_returns_exchangeId_idx` ON `pos_returns`(`exchangeId`);

ALTER TABLE `pos_exchanges`
  ADD CONSTRAINT `pos_exchanges_sourceSaleId_fkey` FOREIGN KEY (`sourceSaleId`) REFERENCES `pos_sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `pos_exchanges_replacementSaleId_fkey` FOREIGN KEY (`replacementSaleId`) REFERENCES `pos_sales`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `pos_exchanges_operatorId_fkey` FOREIGN KEY (`operatorId`) REFERENCES `admin_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `pos_returns`
  ADD CONSTRAINT `pos_returns_exchangeId_fkey` FOREIGN KEY (`exchangeId`) REFERENCES `pos_exchanges`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE `commission_entries` AS original
INNER JOIN (
  SELECT `saleItemId`, SUM(ABS(`amount`)) AS cancelled
  FROM `commission_entries`
  WHERE `status` = 'REVERSED' AND `amount` < 0
  GROUP BY `saleItemId`
) AS reversals ON reversals.`saleItemId` = original.`saleItemId`
SET original.`cancelledAmount` = LEAST(original.`amount`, reversals.cancelled),
    original.`status` = IF(reversals.cancelled >= original.`amount`, 'CANCELLED', 'EARNED')
WHERE original.`status` = 'EARNED' AND original.`amount` >= 0;

UPDATE `commission_entries`
SET `amount` = 0,
    `cancelledAmount` = 0,
    `status` = 'CANCELLED'
WHERE `status` = 'REVERSED' AND `amount` < 0;
