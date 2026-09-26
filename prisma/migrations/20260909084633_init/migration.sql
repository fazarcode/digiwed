-- CreateTable
CREATE TABLE `Gift` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `kind` ENUM('MONEY', 'GOODS') NOT NULL DEFAULT 'MONEY',
    `provider` VARCHAR(191) NULL,
    `accountName` VARCHAR(191) NULL,
    `accountNumber` VARCHAR(191) NULL,
    `instructions` TEXT NULL,
    `itemName` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `link` TEXT NULL,
    `recipientName` VARCHAR(191) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Gift_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Role` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Role_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING') NOT NULL DEFAULT 'ACTIVE',
    `roleId` VARCHAR(191) NOT NULL,
    `packageId` VARCHAR(191) NULL,
    `templateId` VARCHAR(191) NULL,
    `whatsappTemplate` TEXT NULL,
    `resetToken` VARCHAR(191) NULL,
    `resetTokenExp` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_resetToken_key`(`resetToken`),
    INDEX `User_roleId_idx`(`roleId`),
    INDEX `User_templateId_idx`(`templateId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Package` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `features` JSON NOT NULL,
    `price` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EventMoment` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `senderName` VARCHAR(191) NULL,
    `message` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventMoment_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Template` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `folderPath` VARCHAR(191) NOT NULL,
    `previewImage` VARCHAR(191) NULL,
    `manifest` JSON NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Template_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invitation` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'PUBLISHED') NOT NULL DEFAULT 'DRAFT',
    `brideName` VARCHAR(191) NULL,
    `groomName` VARCHAR(191) NULL,
    `brideParents` TEXT NULL,
    `groomParents` TEXT NULL,
    `groomFather` VARCHAR(191) NULL,
    `groomMother` VARCHAR(191) NULL,
    `brideFather` VARCHAR(191) NULL,
    `brideMother` VARCHAR(191) NULL,
    `quote` TEXT NULL,
    `loveStory` JSON NULL,
    `events` JSON NULL,
    `coverImage` TEXT NULL,
    `bridePhoto` TEXT NULL,
    `groomPhoto` VARCHAR(191) NULL,
    `momentsTitle` VARCHAR(191) NULL,
    `momentsMessage` TEXT NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#8B6F47',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#D4A574',
    `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#FAF7F2',
    `fontFamily` VARCHAR(191) NOT NULL DEFAULT 'Playfair Display',
    `buttonStyle` VARCHAR(191) NOT NULL DEFAULT 'rounded',
    `borderRadius` VARCHAR(191) NOT NULL DEFAULT '12',
    `animation` VARCHAR(191) NOT NULL DEFAULT 'fade',
    `rsvpMode` ENUM('QR_FIRST', 'RSVP_FIRST') NOT NULL DEFAULT 'QR_FIRST',
    `selfieVerification` BOOLEAN NOT NULL DEFAULT false,
    `customDomain` VARCHAR(191) NULL,
    `subdomain` VARCHAR(191) NULL,
    `tvEnabled` BOOLEAN NOT NULL DEFAULT false,
    `tvBackground` TEXT NULL,
    `tvCouplePhoto` TEXT NULL,
    `tvLogo` TEXT NULL,
    `tvDuration` INTEGER NOT NULL DEFAULT 7,
    `tvSoundEnabled` BOOLEAN NOT NULL DEFAULT false,
    `tvAnimationEnabled` BOOLEAN NOT NULL DEFAULT true,
    `tvFontSize` VARCHAR(191) NOT NULL DEFAULT 'large',
    `tvFullscreen` BOOLEAN NOT NULL DEFAULT true,
    `packageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Invitation_slug_key`(`slug`),
    UNIQUE INDEX `Invitation_customDomain_key`(`customDomain`),
    UNIQUE INDEX `Invitation_subdomain_key`(`subdomain`),
    INDEX `Invitation_userId_idx`(`userId`),
    INDEX `Invitation_templateId_idx`(`templateId`),
    INDEX `Invitation_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Guest` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `guestType` ENUM('INDIVIDUAL', 'GROUP') NOT NULL DEFAULT 'INDIVIDUAL',
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `guestSide` ENUM('GROOM', 'BRIDE', 'BOTH', 'PARENTS') NULL,
    `quota` INTEGER NOT NULL DEFAULT 1,
    `priorityOverride` INTEGER NULL,
    `categoryId` VARCHAR(191) NULL,
    `categoryText` VARCHAR(191) NULL,
    `sideId` VARCHAR(191) NULL,
    `token` VARCHAR(191) NOT NULL,
    `checkedInAt` DATETIME(3) NULL,
    `checkedInCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Guest_token_key`(`token`),
    INDEX `Guest_invitationId_idx`(`invitationId`),
    INDEX `Guest_categoryId_idx`(`categoryId`),
    INDEX `Guest_sideId_idx`(`sideId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuestCategory` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 100,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuestCategory_invitationId_idx`(`invitationId`),
    UNIQUE INDEX `GuestCategory_invitationId_name_key`(`invitationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Device` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `notes` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Device_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CheckIn` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NOT NULL,
    `deviceId` VARCHAR(191) NULL,
    `operatorName` VARCHAR(191) NULL,
    `selfieUrl` TEXT NULL,
    `count` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CheckIn_invitationId_idx`(`invitationId`),
    INDEX `CheckIn_guestId_idx`(`guestId`),
    INDEX `CheckIn_deviceId_idx`(`deviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GalleryImage` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `caption` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `GalleryImage_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Video` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `type` ENUM('YOUTUBE', 'VIMEO', 'MP4') NOT NULL DEFAULT 'MP4',
    `title` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Video_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Music` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `url` TEXT NOT NULL,
    `title` VARCHAR(191) NULL,
    `autoplay` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Music_invitationId_key`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rsvp` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `attendance` ENUM('ATTENDING', 'NOT_ATTENDING', 'MAYBE') NOT NULL DEFAULT 'ATTENDING',
    `rsvpType` ENUM('INDIVIDUAL', 'GROUP') NOT NULL DEFAULT 'INDIVIDUAL',
    `guestCount` INTEGER NOT NULL DEFAULT 1,
    `message` TEXT NULL,
    `customData` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Rsvp_invitationId_idx`(`invitationId`),
    INDEX `Rsvp_guestId_idx`(`guestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Setting` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MessageTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MessageTemplate_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RsvpField` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `fieldKey` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'text',
    `placeholder` VARCHAR(191) NULL,
    `required` BOOLEAN NOT NULL DEFAULT false,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `options` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `RsvpField_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GuestSideOption` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GuestSideOption_invitationId_idx`(`invitationId`),
    UNIQUE INDEX `GuestSideOption_invitationId_name_key`(`invitationId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GiftEntry` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NULL,
    `kind` ENUM('MONEY', 'GOODS') NOT NULL DEFAULT 'MONEY',
    `amount` DECIMAL(14, 2) NULL,
    `itemName` VARCHAR(191) NULL,
    `giverName` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `proofUrl` TEXT NULL,
    `physicalItemId` VARCHAR(191) NULL,
    `quantity` INTEGER NULL,
    `checkInId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `GiftEntry_invitationId_idx`(`invitationId`),
    INDEX `GiftEntry_guestId_idx`(`guestId`),
    INDEX `GiftEntry_physicalItemId_idx`(`physicalItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Souvenir` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image` TEXT NULL,
    `quota` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Souvenir_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SouvenirDistribution` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `souvenirId` VARCHAR(191) NOT NULL,
    `guestId` VARCHAR(191) NULL,
    `checkInId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `operatorName` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SouvenirDistribution_invitationId_idx`(`invitationId`),
    INDEX `SouvenirDistribution_souvenirId_idx`(`souvenirId`),
    INDEX `SouvenirDistribution_guestId_idx`(`guestId`),
    UNIQUE INDEX `SouvenirDistribution_souvenirId_guestId_key`(`souvenirId`, `guestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PhysicalGiftItem` (
    `id` VARCHAR(191) NOT NULL,
    `invitationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `image` TEXT NULL,
    `quota` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PhysicalGiftItem_invitationId_idx`(`invitationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Testimonial` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `avatar` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Gift` ADD CONSTRAINT `Gift_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `Package`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `Template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventMoment` ADD CONSTRAINT `EventMoment_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_templateId_fkey` FOREIGN KEY (`templateId`) REFERENCES `Template`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `Package`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guest` ADD CONSTRAINT `Guest_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guest` ADD CONSTRAINT `Guest_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `GuestCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Guest` ADD CONSTRAINT `Guest_sideId_fkey` FOREIGN KEY (`sideId`) REFERENCES `GuestSideOption`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestCategory` ADD CONSTRAINT `GuestCategory_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Device` ADD CONSTRAINT `Device_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CheckIn` ADD CONSTRAINT `CheckIn_deviceId_fkey` FOREIGN KEY (`deviceId`) REFERENCES `Device`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GalleryImage` ADD CONSTRAINT `GalleryImage_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Video` ADD CONSTRAINT `Video_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Music` ADD CONSTRAINT `Music_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rsvp` ADD CONSTRAINT `Rsvp_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rsvp` ADD CONSTRAINT `Rsvp_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MessageTemplate` ADD CONSTRAINT `MessageTemplate_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RsvpField` ADD CONSTRAINT `RsvpField_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GuestSideOption` ADD CONSTRAINT `GuestSideOption_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GiftEntry` ADD CONSTRAINT `GiftEntry_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GiftEntry` ADD CONSTRAINT `GiftEntry_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GiftEntry` ADD CONSTRAINT `GiftEntry_physicalItemId_fkey` FOREIGN KEY (`physicalItemId`) REFERENCES `PhysicalGiftItem`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Souvenir` ADD CONSTRAINT `Souvenir_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SouvenirDistribution` ADD CONSTRAINT `SouvenirDistribution_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SouvenirDistribution` ADD CONSTRAINT `SouvenirDistribution_souvenirId_fkey` FOREIGN KEY (`souvenirId`) REFERENCES `Souvenir`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SouvenirDistribution` ADD CONSTRAINT `SouvenirDistribution_guestId_fkey` FOREIGN KEY (`guestId`) REFERENCES `Guest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PhysicalGiftItem` ADD CONSTRAINT `PhysicalGiftItem_invitationId_fkey` FOREIGN KEY (`invitationId`) REFERENCES `Invitation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
