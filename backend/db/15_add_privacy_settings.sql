-- ============================================
-- Add Privacy Settings to Users Table
-- ============================================

USE blood_donation_db;

-- Add privacy settings columns to users table
ALTER TABLE users 
ADD COLUMN availableToDonate BOOLEAN DEFAULT TRUE,
ADD COLUMN showPhoneNumber BOOLEAN DEFAULT TRUE,
ADD COLUMN anonymousMode BOOLEAN DEFAULT FALSE;

-- Add index for availableToDonate for faster filtering
CREATE INDEX idx_availableToDonate ON users(availableToDonate);

-- Update existing users to have default privacy settings
UPDATE users 
SET availableToDonate = TRUE,
    showPhoneNumber = TRUE,
    anonymousMode = FALSE
WHERE availableToDonate IS NULL;
