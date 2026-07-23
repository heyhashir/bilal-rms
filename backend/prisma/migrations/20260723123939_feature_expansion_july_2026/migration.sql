-- AlterTable
ALTER TABLE `categories` ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `parentId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `inventory_movements` ADD COLUMN `vendorPurchaseId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `product_variants` ADD COLUMN `costPrice` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `costPrice` DECIMAL(10, 2) NULL;

-- AlterTable
ALTER TABLE `store_settings` MODIFY `logoPrimaryText` VARCHAR(191) NOT NULL DEFAULT 'BALY';

-- CreateTable
CREATE TABLE `admin_accounts` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('ADMIN', 'MANAGER', 'STAFF') NOT NULL DEFAULT 'STAFF',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_accounts_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_sessions` (
    `id` VARCHAR(191) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_sessions_token_key`(`token`),
    INDEX `admin_sessions_accountId_idx`(`accountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NOT NULL DEFAULT '',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_purchases` (
    `id` VARCHAR(191) NOT NULL,
    `vendorId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `variantId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `unitCost` DECIMAL(10, 2) NOT NULL,
    `purchasedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `note` VARCHAR(191) NOT NULL DEFAULT '',
    `ledgerEntryId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `vendor_purchases_ledgerEntryId_key`(`ledgerEntryId`),
    INDEX `vendor_purchases_vendorId_idx`(`vendorId`),
    INDEX `vendor_purchases_productId_idx`(`productId`),
    INDEX `vendor_purchases_variantId_idx`(`variantId`),
    INDEX `vendor_purchases_purchasedAt_idx`(`purchasedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ledger_entries` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('SALE', 'PURCHASE', 'EXPENSE', 'ADJUSTMENT') NOT NULL,
    `direction` ENUM('CREDIT', 'DEBIT') NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `note` VARCHAR(191) NOT NULL DEFAULT '',
    `orderId` VARCHAR(191) NULL,
    `posSaleId` VARCHAR(191) NULL,
    `vendorPurchaseId` VARCHAR(191) NULL,
    `adminAccountId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ledger_entries_vendorPurchaseId_key`(`vendorPurchaseId`),
    INDEX `ledger_entries_type_idx`(`type`),
    INDEX `ledger_entries_direction_idx`(`direction`),
    INDEX `ledger_entries_orderId_idx`(`orderId`),
    INDEX `ledger_entries_posSaleId_idx`(`posSaleId`),
    INDEX `ledger_entries_adminAccountId_idx`(`adminAccountId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `categories_parentId_idx` ON `categories`(`parentId`);

-- CreateIndex
CREATE INDEX `inventory_movements_vendorPurchaseId_idx` ON `inventory_movements`(`vendorPurchaseId`);

-- AddForeignKey
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `admin_accounts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_vendorPurchaseId_fkey` FOREIGN KEY (`vendorPurchaseId`) REFERENCES `vendor_purchases`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_purchases` ADD CONSTRAINT `vendor_purchases_vendorId_fkey` FOREIGN KEY (`vendorId`) REFERENCES `vendors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_purchases` ADD CONSTRAINT `vendor_purchases_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_purchases` ADD CONSTRAINT `vendor_purchases_variantId_fkey` FOREIGN KEY (`variantId`) REFERENCES `product_variants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_purchases` ADD CONSTRAINT `vendor_purchases_ledgerEntryId_fkey` FOREIGN KEY (`ledgerEntryId`) REFERENCES `ledger_entries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_posSaleId_fkey` FOREIGN KEY (`posSaleId`) REFERENCES `pos_sales`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ledger_entries` ADD CONSTRAINT `ledger_entries_adminAccountId_fkey` FOREIGN KEY (`adminAccountId`) REFERENCES `admin_accounts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
