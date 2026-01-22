-- ============================================
-- Add 'scheduled' to urgency ENUM
-- ============================================

USE blood_donation_db;

-- Update urgency ENUM to include 'scheduled'
ALTER TABLE requests 
MODIFY COLUMN urgency ENUM('emergency', 'urgent', 'normal', 'scheduled') NOT NULL;
