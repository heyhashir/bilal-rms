-- Preserve the cost basis that applied when a sale was finalized.
ALTER TABLE `order_items` ADD COLUMN `unitCost` DECIMAL(10, 2) NULL;

ALTER TABLE `pos_sale_items` ADD COLUMN `unitCost` DECIMAL(10, 2) NULL;
