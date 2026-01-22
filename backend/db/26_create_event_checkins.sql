-- Migration: Create event check-in system
-- Tracks when donors check in at events (QR code or manual)

USE blood_donation_db;

-- Create event_checkins table
CREATE TABLE IF NOT EXISTS event_checkins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId INT NOT NULL,
    donationId INT NOT NULL,
    userId INT NULL,
    checkInMethod ENUM('qr_code', 'manual', 'self') DEFAULT 'manual',
    checkedInBy INT NULL COMMENT 'Organization staff member who checked in (if manual)',
    checkedInAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL COMMENT 'Optional notes from staff',
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (checkedInBy) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_eventId (eventId),
    INDEX idx_donationId (donationId),
    INDEX idx_userId (userId),
    INDEX idx_checkedInAt (checkedInAt),
    UNIQUE KEY unique_donation_checkin (donationId) COMMENT 'One check-in per donation'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add checkInCode to donations table for QR code generation
-- MySQL doesn't support IF NOT EXISTS with ALTER TABLE, so we check first
SET @dbname = DATABASE();
SET @tablename = 'donations';
SET @columnname1 = 'checkInCode';
SET @columnname2 = 'checkInCodeGeneratedAt';
SET @indexname = 'idx_checkInCode';

-- Check and add checkInCode column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname1)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname1, ' VARCHAR(50) NULL COMMENT ''Unique code for QR code check-in''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add checkInCodeGeneratedAt column
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname2)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname2, ' DATETIME NULL')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Check and add index
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (INDEX_NAME = @indexname)
  ) > 0,
  'SELECT 1',
  CONCAT('CREATE INDEX ', @indexname, ' ON ', @tablename, '(', @columnname1, ')')
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;
