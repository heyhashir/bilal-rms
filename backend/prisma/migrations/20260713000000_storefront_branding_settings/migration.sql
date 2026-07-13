ALTER TABLE `store_settings`
  ADD COLUMN `logoPrimaryText` VARCHAR(191) NOT NULL DEFAULT 'BALI',
  ADD COLUMN `logoSecondaryText` VARCHAR(191) NOT NULL DEFAULT 'By Bilal Garments',
  ADD COLUMN `logoTertiaryText` VARCHAR(191) NOT NULL DEFAULT 'EST 2001',
  ADD COLUMN `promoRibbonText` VARCHAR(1000) NOT NULL DEFAULT 'Free shipping over Rs. 6,000\nNew drop\nAW26 collection live now\nCOD available across Pakistan\nEasy 7-day returns';
