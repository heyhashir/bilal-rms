-- Product variant images are read by every catalog projection and must exist on
-- both fresh databases and upgraded installations.
ALTER TABLE `product_variants`
  ADD COLUMN `image` VARCHAR(191) NULL;
