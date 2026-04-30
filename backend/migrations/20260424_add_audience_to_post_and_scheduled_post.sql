-- Add audience support for admin messages (parents|students)
-- Safe to run on MySQL 8+ environments.

ALTER TABLE `Post`
    ADD COLUMN IF NOT EXISTS `audience` ENUM('parents', 'students') NOT NULL DEFAULT 'parents' AFTER `priority`;

ALTER TABLE `scheduledPost`
    ADD COLUMN IF NOT EXISTS `audience` ENUM('parents', 'students') NOT NULL DEFAULT 'parents' AFTER `priority`;
