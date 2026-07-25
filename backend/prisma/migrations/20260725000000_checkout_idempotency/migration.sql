-- Add a stable optional client key so checkout retries cannot create duplicate orders.
ALTER TABLE `orders` ADD COLUMN `checkoutKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `orders_checkoutKey_key` ON `orders`(`checkoutKey`);
