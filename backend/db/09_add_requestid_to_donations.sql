-- ============================================
-- Migration: Add requestId to donations table
-- Description: Links donations to specific requests for peer-to-peer matching
-- Date: 2024
-- ============================================

USE blood_donation_db;

-- Add requestId column to donations table
ALTER TABLE donations
ADD COLUMN requestId INT NULL AFTER eventDate,
ADD CONSTRAINT fk_donation_request 
  FOREIGN KEY (requestId) REFERENCES requests(id) 
  ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_requestId ON donations(requestId);

-- ============================================
-- Verification queries
-- ============================================

-- Check if column was added
DESCRIBE donations;

-- Check foreign key constraint
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'blood_donation_db'
  AND TABLE_NAME = 'donations'
  AND COLUMN_NAME = 'requestId';

