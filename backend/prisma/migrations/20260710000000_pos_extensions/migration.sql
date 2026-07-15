-- AlterTable
ALTER TABLE `products`
  ADD COLUMN `barcode` VARCHAR(191) NULL,
  ADD COLUMN `qrCode` VARCHAR(191) NULL,
  ADD COLUMN `supplierBarcode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product_variants`
  ADD COLUMN `barcode` VARCHAR(191) NULL,
  ADD COLUMN `qrCode` VARCHAR(191) NULL,
  ADD COLUMN `supplierBarcode` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `inventory_movements`
  MODIFY `reason` ENUM('IMPORT', 'ADJUSTMENT', 'ORDER', 'RETURN', 'RESTOCK', 'MANUAL', 'POS_SALE', 'POS_REFUND') NOT NULL,
  ADD COLUMN `source` ENUM('ONLINE', 'POS') NULL,
  ADD COLUMN `reference` VARCHAR(191) NULL,
  ADD COLUMN `orderId` VARCHAR(191) NULL,
  ADD COLUMN `posSaleId` VARCHAR(191) NULL,
  ADD COLUMN `posReturnId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `store_settings`
  ADD COLUMN `receiptPrefix` VARCHAR(191) NOT NULL DEFAULT 'REC',
  ADD COLUMN `thermalHeader` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `thermalFooter` VARCHAR(191) NOT NULL DEFAULT '',
  ADD COLUMN `barcodePrefix` VARCHAR(191) NOT NULL DEFAULT 'BG',
  ADD COLUMN `qrPrefix` VARCHAR(191) NOT NULL DEFAULT 'BGQR';

-- CreateTable
CREATE TABLE `commission_rules` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `variantId` VARCHAR(191) NULL,
  `rate` DECIMAL(5, 2) NOT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `commission_rules_productId_key`(`productId`),
  UNIQUE INDEX `commission_rules_variantId_key`(`variantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `notes` VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `register_devices` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `deviceKey` VARCHAR(191) NOT NULL,
  `syncStatus` ENUM('PENDING', 'SYNCED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `lastSeenAt` DATETIME(3) NULL,
  `lastSyncAt` DATETIME(3) NULL,
  `notes` VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `register_devices_deviceKey_key`(`deviceKey`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_sales` (
  `id` VARCHAR(191) NOT NULL,
  `saleNumber` VARCHAR(191) NOT NULL,
  `source` ENUM('ONLINE', 'POS') NOT NULL DEFAULT 'POS',
  `status` ENUM('DRAFT', 'FINALIZED', 'VOID', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
  `customerName` VARCHAR(191) NULL,
  `customerPhone` VARCHAR(191) NULL,
  `customerEmail` VARCHAR(191) NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `total` DECIMAL(10, 2) NOT NULL,
  `paidAmount` DECIMAL(10, 2) NOT NULL,
  `paymentMethod` ENUM('CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER') NULL,
  `notes` TEXT NULL,
  `syncedStatus` ENUM('PENDING', 'SYNCED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `syncedAt` DATETIME(3) NULL,
  `finalizedAt` DATETIME(3) NULL,
  `deviceId` VARCHAR(191) NULL,
  `deviceName` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `pos_sales_saleNumber_key`(`saleNumber`),
  INDEX `pos_sales_deviceId_idx`(`deviceId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_sale_items` (
  `id` VARCHAR(191) NOT NULL,
  `saleId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NULL,
  `employeeId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `sku` VARCHAR(191) NULL,
  `imagePath` VARCHAR(191) NOT NULL,
  `barcode` VARCHAR(191) NULL,
  `qrCode` VARCHAR(191) NULL,
  `size` VARCHAR(191) NULL,
  `colorName` VARCHAR(191) NULL,
  `unitPrice` DECIMAL(10, 2) NOT NULL,
  `qty` INTEGER NOT NULL,
  `refundedQty` INTEGER NOT NULL DEFAULT 0,
  `lineTotal` DECIMAL(10, 2) NOT NULL,
  `commissionRate` DECIMAL(5, 2) NULL,
  `commissionAmount` DECIMAL(10, 2) NULL,

  INDEX `pos_sale_items_saleId_idx`(`saleId`),
  INDEX `pos_sale_items_productId_idx`(`productId`),
  INDEX `pos_sale_items_variantId_idx`(`variantId`),
  INDEX `pos_sale_items_employeeId_idx`(`employeeId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_payments` (
  `id` VARCHAR(191) NOT NULL,
  `saleId` VARCHAR(191) NOT NULL,
  `method` ENUM('CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER') NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `reference` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `pos_payments_saleId_idx`(`saleId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pos_returns` (
  `id` VARCHAR(191) NOT NULL,
  `saleId` VARCHAR(191) NOT NULL,
  `saleItemId` VARCHAR(191) NULL,
  `reason` VARCHAR(191) NOT NULL,
  `note` VARCHAR(191) NOT NULL DEFAULT '',
  `qty` INTEGER NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  INDEX `pos_returns_saleId_idx`(`saleId`),
  INDEX `pos_returns_saleItemId_idx`(`saleItemId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_entries` (
  `id` VARCHAR(191) NOT NULL,
  `employeeId` VARCHAR(191) NOT NULL,
  `saleId` VARCHAR(191) NOT NULL,
  `saleItemId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `variantId` VARCHAR(191) NULL,
  `rate` DECIMAL(5, 2) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('EARNED', 'REVERSED', 'PAID') NOT NULL DEFAULT 'EARNED',
  `note` VARCHAR(191) NOT NULL DEFAULT '',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `commission_entries_employeeId_idx`(`employeeId`),
  INDEX `commission_entries_saleId_idx`(`saleId`),
  INDEX `commission_entries_saleItemId_idx`(`saleItemId`),
  INDEX `commission_entries_productId_idx`(`productId`),
  INDEX `commission_entries_variantId_idx`(`variantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
  `id` VARCHAR(191) NOT NULL,
  `saleId` VARCHAR(191) NOT NULL,
  `receiptNumber` VARCHAR(191) NOT NULL,
  `invoiceNumber` VARCHAR(191) NOT NULL,
  `reprintCount` INTEGER NOT NULL DEFAULT 0,
  `lastPrintedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `receipts_saleId_key`(`saleId`),
  UNIQUE INDEX `receipts_receiptNumber_key`(`receiptNumber`),
  UNIQUE INDEX `receipts_invoiceNumber_key`(`invoiceNumber`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sync_jobs` (
  `id` VARCHAR(191) NOT NULL,
  `deviceId` VARCHAR(191) NULL,
  `direction` ENUM('PUSH', 'PULL') NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NULL,
  `payload` JSON NOT NULL,
  `status` ENUM('PENDING', 'SYNCED', 'FAILED') NOT NULL DEFAULT 'PENDING',
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `lastError` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `sync_jobs_deviceId_idx`(`deviceId`),
  INDEX `sync_jobs_status_idx`(`status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `products_barcode_key` ON `products`(`barcode`);

-- CreateIndex
CREATE UNIQUE INDEX `products_qrCode_key` ON `products`(`qrCode`);

-- CreateIndex
CREATE UNIQUE INDEX `product_variants_barcode_key` ON `product_variants`(`barcode`);

-- CreateIndex
CREATE UNIQUE INDEX `product_variants_qrCode_key` ON `product_variants`(`qrCode`);

-- CreateIndex
CREATE INDEX `inventory_movements_orderId_idx` ON `inventory_movements`(`orderId`);

-- CreateIndex
CREATE INDEX `inventory_movements_posSaleId_idx` ON `inventory_movements`(`posSaleId`);

-- CreateIndex
CREATE INDEX `inventory_movements_posReturnId_idx` ON `inventory_movements`(`posReturnId`);

-- AddForeignKey
ALTER TABLE `commission_rules` ADD CONSTRAINT `commission_rules_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_rules` ADD CONSTRAINT `commission_rules_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sales` ADD CONSTRAINT `pos_sales_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `register_devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sale_items` ADD CONSTRAINT `pos_sale_items_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `pos_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sale_items` ADD CONSTRAINT `pos_sale_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sale_items` ADD CONSTRAINT `pos_sale_items_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_sale_items` ADD CONSTRAINT `pos_sale_items_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_payments` ADD CONSTRAINT `pos_payments_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `pos_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_returns` ADD CONSTRAINT `pos_returns_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `pos_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pos_returns` ADD CONSTRAINT `pos_returns_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `pos_sale_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `pos_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_saleItemId_fkey` FOREIGN KEY (`saleItemId`) REFERENCES `pos_sale_items`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_entries` ADD CONSTRAINT `commission_entries_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_saleId_fkey` FOREIGN KEY (`saleId`) REFERENCES `pos_sales`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sync_jobs` ADD CONSTRAINT `sync_jobs_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `register_devices`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_posSaleId_fkey` FOREIGN KEY (`posSaleId`) REFERENCES `pos_sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_posReturnId_fkey` FOREIGN KEY (`posReturnId`) REFERENCES `pos_returns`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
