-- DropForeignKey
ALTER TABLE `giftentry` DROP FOREIGN KEY `GiftEntry_guestId_fkey`;

-- DropForeignKey
ALTER TABLE `rsvp` DROP FOREIGN KEY `Rsvp_guestId_fkey`;

-- DropForeignKey
ALTER TABLE `souvenirdistribution` DROP FOREIGN KEY `SouvenirDistribution_guestId_fkey`;

-- AlterTable
ALTER TABLE `invitation` ADD COLUMN `quotaMode` ENUM('STRICT', 'FLEXIBLE') NOT NULL DEFAULT 'FLEXIBLE';

-- AddForeignKey
ALTER TABLE `Rsvp` ADD CONSTRAINT `Rsvp_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GiftEntry` ADD CONSTRAINT `GiftEntry_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SouvenirDistribution` ADD CONSTRAINT `SouvenirDistribution_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
