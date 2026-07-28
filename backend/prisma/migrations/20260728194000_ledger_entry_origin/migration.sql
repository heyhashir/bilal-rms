ALTER TABLE `ledger_entries`
  ADD COLUMN `isManual` BOOLEAN NOT NULL DEFAULT false;

UPDATE `ledger_entries`
SET `isManual` = true
WHERE `orderId` IS NULL
  AND `posSaleId` IS NULL
  AND `vendorPurchaseId` IS NULL
  AND `type` IN ('EXPENSE', 'ADJUSTMENT')
  AND `note` NOT LIKE 'Purchase reversal:%';
