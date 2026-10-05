-- Phase 2 — additive, minimal migration. No existing columns/tables changed or dropped.

-- Guest: separate tracking code + URL name slug (both nullable; existing rows backfilled by prisma/backfill_phase2.js).
ALTER TABLE `Guest` ADD COLUMN `trackingCode` VARCHAR(191) NULL;
ALTER TABLE `Guest` ADD COLUMN `nameSlug` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Guest_invitationId_trackingCode_key` ON `Guest`(`invitationId`, `trackingCode`);
CREATE UNIQUE INDEX `Guest_invitationId_nameSlug_key` ON `Guest`(`invitationId`, `nameSlug`);

-- Invitation: independent RSVP / Message toggles (default ON preserves current behavior).
ALTER TABLE `Invitation` ADD COLUMN `rsvpEnabled` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Invitation` ADD COLUMN `messageEnabled` BOOLEAN NOT NULL DEFAULT true;

-- Rsvp: mark message-only submissions so they are excluded from RSVP stats.
ALTER TABLE `Rsvp` ADD COLUMN `isMessageOnly` BOOLEAN NOT NULL DEFAULT false;

-- Testimonial: owner-scoped ratings (NULL = admin/global, existing rows unchanged).
ALTER TABLE `Testimonial` ADD COLUMN `userId` VARCHAR(191) NULL;
CREATE INDEX `Testimonial_userId_idx` ON `Testimonial`(`userId`);
ALTER TABLE `Testimonial` ADD CONSTRAINT `Testimonial_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
