-- ============================================
-- Enhance Notifications for Sharing Feature
-- ============================================

USE blood_donation_db;

-- Add new fields to notifications table
ALTER TABLE notifications 
ADD COLUMN title VARCHAR(255) NULL,
ADD COLUMN isCompatible BOOLEAN DEFAULT TRUE,
ADD COLUMN isSameLocation BOOLEAN DEFAULT TRUE;

-- Update type ENUM to include SHARE_REQUEST
ALTER TABLE notifications 
MODIFY COLUMN type ENUM('BLOOD_REQUEST', 'SHARE_REQUEST', 'REQUEST_ACCEPTED', 'CAMPAIGN') NOT NULL;

-- Update existing notifications to have default values
-- Temporarily disable safe update mode for this operation
SET SQL_SAFE_UPDATES = 0;

UPDATE notifications 
SET isCompatible = COALESCE(isCompatible, TRUE),
    isSameLocation = COALESCE(isSameLocation, TRUE)
WHERE isCompatible IS NULL OR isSameLocation IS NULL;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;
