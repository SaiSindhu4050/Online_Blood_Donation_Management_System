-- ============================================
-- Cleanup Orphaned Notifications
-- ============================================
-- This script removes notifications that reference deleted requests
-- Run this once to clean up any existing orphaned notifications

USE blood_donation_db;

-- Delete notifications that reference non-existent requests
-- Temporarily disable safe update mode for this operation
SET SQL_SAFE_UPDATES = 0;

DELETE n FROM notifications n
LEFT JOIN requests r ON n.referenceId = r.id
WHERE n.type IN ('BLOOD_REQUEST', 'SHARE_REQUEST')
  AND n.referenceId IS NOT NULL
  AND r.id IS NULL;

-- Re-enable safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Show how many were deleted (run separately to see count)
-- SELECT COUNT(*) as orphaned_notifications
-- FROM notifications n
-- LEFT JOIN requests r ON n.referenceId = r.id
-- WHERE n.type IN ('BLOOD_REQUEST', 'SHARE_REQUEST')
--   AND n.referenceId IS NOT NULL
--   AND r.id IS NULL;
