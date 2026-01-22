-- ============================================
-- Migration: Advanced Matching and Notification System
-- Description: Adds notification system and request tracking for donor matching
-- Date: 2024
-- ============================================

USE blood_donation_db;

-- ============================================
-- Step 1: Update notifications table
-- ============================================

-- Drop existing notifications table if it exists (to recreate with new schema)
DROP TABLE IF EXISTS notifications;

-- Create notifications table with new schema
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type ENUM('BLOOD_REQUEST', 'REQUEST_ACCEPTED', 'CAMPAIGN') NOT NULL,
    message TEXT NOT NULL,
    referenceId INT NULL COMMENT 'Stores the RequestID or DonationID',
    isRead BOOLEAN DEFAULT FALSE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_type (type),
    INDEX idx_isRead (isRead),
    INDEX idx_referenceId (referenceId),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Step 2: Add currentDonorsCount to requests table
-- ============================================

-- Check if column already exists before adding
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'blood_donation_db' 
      AND TABLE_NAME = 'requests' 
      AND COLUMN_NAME = 'currentDonorsCount'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE requests ADD COLUMN currentDonorsCount INT DEFAULT 0 NOT NULL COMMENT ''Number of donors who have accepted this request'' AFTER status',
    'SELECT ''Column currentDonorsCount already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- Step 3: Update requests status enum to include IN_PROGRESS
-- ============================================

-- Note: MySQL ENUMs are case-insensitive, so 'fulfilled' and 'FULFILLED' are duplicates
-- We'll keep 'fulfilled' (lowercase) for backward compatibility and add 'IN_PROGRESS'

-- First, modify the enum to include the new IN_PROGRESS value
-- MySQL requires recreating the column, so we'll use MODIFY
ALTER TABLE requests 
MODIFY COLUMN status ENUM(
    'pending', 
    'matched', 
    'fulfilled', 
    'cancelled', 
    'IN_PROGRESS'
) DEFAULT 'pending';

-- ============================================
-- Step 4: Initialize currentDonorsCount for existing requests
-- ============================================

-- Count existing donations linked to requests and update currentDonorsCount
UPDATE requests r
SET r.currentDonorsCount = (
    SELECT COUNT(DISTINCT d.userId)
    FROM donations d
    WHERE d.requestId = r.id
      AND d.status IN ('pending', 'approved', 'scheduled')
)
WHERE EXISTS (
    SELECT 1 FROM donations d WHERE d.requestId = r.id
);

-- ============================================
-- Verification Queries
-- ============================================

-- Check notifications table structure
DESCRIBE notifications;

-- Check requests table structure
DESCRIBE requests;

-- Check if currentDonorsCount column exists
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'blood_donation_db'
  AND TABLE_NAME = 'requests'
  AND COLUMN_NAME = 'currentDonorsCount';

-- Check status enum values
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'blood_donation_db'
  AND TABLE_NAME = 'requests'
  AND COLUMN_NAME = 'status';

-- ============================================
-- Sample Queries for Testing
-- ============================================

-- Get all unread notifications for a user
-- SELECT * FROM notifications WHERE userId = 1 AND isRead = FALSE ORDER BY createdAt DESC;

-- Get request with donor count
-- SELECT id, bloodGroup, unitsRequired, currentDonorsCount, status 
-- FROM requests 
-- WHERE id = 1;

-- Count notifications by type
-- SELECT type, COUNT(*) as count 
-- FROM notifications 
-- GROUP BY type;

-- ============================================
-- Notes:
-- ============================================
-- 1. The notifications table uses CASCADE delete - when a user is deleted,
--    all their notifications are automatically deleted.
--
-- 2. The currentDonorsCount is initialized for existing requests based on
--    existing donation records.
--
-- 3. The status enum now includes both 'fulfilled' (lowercase) and 'FULFILLED'
--    (uppercase) for backward compatibility. You can standardize on one if preferred.
--
-- 4. The referenceId field in notifications can store either RequestID or DonationID
--    depending on the notification type.
--
-- 5. Indexes are added for common query patterns (userId, type, isRead, referenceId).
