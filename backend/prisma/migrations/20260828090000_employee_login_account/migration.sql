-- AlterTable
ALTER TABLE `employees`
  ADD COLUMN `loginAccountId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `employees_loginAccountId_key` ON `employees`(`loginAccountId`);

-- AddForeignKey
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_loginAccountId_fkey`
  FOREIGN KEY (`loginAccountId`) REFERENCES `admin_accounts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `pos_sales`
  ADD COLUMN `cashierAccountId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `pos_sales_cashierAccountId_idx` ON `pos_sales`(`cashierAccountId`);

-- AddForeignKey
ALTER TABLE `pos_sales`
  ADD CONSTRAINT `pos_sales_cashierAccountId_fkey`
  FOREIGN KEY (`cashierAccountId`) REFERENCES `admin_accounts`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
