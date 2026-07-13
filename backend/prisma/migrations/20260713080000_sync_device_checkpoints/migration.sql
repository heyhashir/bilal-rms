ALTER TABLE `register_devices`
  ADD COLUMN `lastBootstrapAt` DATETIME(3) NULL,
  ADD COLUMN `lastCursor` VARCHAR(191) NULL,
  ADD COLUMN `lastSyncError` VARCHAR(191) NULL;

ALTER TABLE `sync_jobs`
  ADD COLUMN `jobKey` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `sync_jobs_deviceId_jobKey_key` ON `sync_jobs`(`deviceId`, `jobKey`);
