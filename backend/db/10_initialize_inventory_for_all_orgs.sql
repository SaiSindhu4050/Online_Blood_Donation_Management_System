-- ============================================
-- Initialize Blood Inventory for All Organizations
-- Description: Adds inventory with count of 1 for each blood type and donation type
--              for all existing organizations
-- Date: 2024
-- ============================================

USE blood_donation_db;

-- ============================================
-- Initialize inventory for all organizations
-- ============================================
-- This script will:
-- 1. Get all active organizations
-- 2. For each organization, create inventory entries for:
--    - All 8 blood types (A+, A-, B+, B-, AB+, AB-, O+, O-)
--    - All 8 donation types (Whole Blood, Plasma, Red Blood Cells, Platelets, Double Red Cells, Cryo, White Cells, Granulocytes)
--    - Count: 1 unit each
--    - Expiration dates based on donation type
--    - Status: 'active'

-- Blood types
SET @blood_types = 'A+,A-,B+,B-,AB+,AB-,O+,O-';

-- Donation types with their expiration days
-- Whole Blood: 42 days
-- Plasma: 365 days
-- Red Blood Cells: 42 days
-- Platelets: 5 days
-- Double Red Cells: 42 days
-- Cryo: 365 days
-- White Cells: 1 day
-- Granulocytes: 1 day

-- Insert inventory for all organizations
-- Using CROSS JOIN to create all combinations
-- Note: We use INSERT IGNORE to skip duplicates, then UPDATE to ensure minimum 1 unit
INSERT IGNORE INTO blood_inventory (
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status
)
SELECT 
    o.id AS organizationId,
    NULL AS donationId,  -- No specific donation linked
    bg.bloodGroup,
    dt.donationType,
    1 AS units,  -- Count of 1 for each
    DATE_ADD(CURDATE(), INTERVAL dt.expirationDays DAY) AS expirationDate,
    'active' AS status
FROM organizations o
CROSS JOIN (
    SELECT 'A+' AS bloodGroup UNION ALL
    SELECT 'A-' UNION ALL
    SELECT 'B+' UNION ALL
    SELECT 'B-' UNION ALL
    SELECT 'AB+' UNION ALL
    SELECT 'AB-' UNION ALL
    SELECT 'O+' UNION ALL
    SELECT 'O-'
) bg
CROSS JOIN (
    SELECT 'Whole Blood' AS donationType, 42 AS expirationDays UNION ALL
    SELECT 'Plasma', 365 UNION ALL
    SELECT 'Red Blood Cells', 42 UNION ALL
    SELECT 'Platelets', 5 UNION ALL
    SELECT 'Double Red Cells', 42 UNION ALL
    SELECT 'Cryo', 365 UNION ALL
    SELECT 'White Cells', 1 UNION ALL
    SELECT 'Granulocytes', 1
) dt
WHERE o.isActive = TRUE;

-- Update existing inventory to ensure at least 1 unit for each combination
-- This handles cases where inventory exists but has 0 units or needs to be set to 1
UPDATE blood_inventory bi
INNER JOIN organizations o ON bi.organizationId = o.id
SET 
    bi.units = GREATEST(bi.units, 1),
    bi.status = 'active',
    bi.updatedAt = NOW()
WHERE o.isActive = TRUE
  AND bi.donationId IS NULL
  AND bi.bloodGroup IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')
  AND bi.donationType IN ('Whole Blood', 'Plasma', 'Red Blood Cells', 'Platelets', 'Double Red Cells', 'Cryo', 'White Cells', 'Granulocytes')
  AND bi.units < 1;

-- ============================================
-- Verification queries
-- ============================================

-- Count total inventory entries created
SELECT 
    COUNT(*) AS total_inventory_entries,
    COUNT(DISTINCT organizationId) AS organizations_with_inventory,
    COUNT(DISTINCT bloodGroup) AS unique_blood_groups,
    COUNT(DISTINCT donationType) AS unique_donation_types
FROM blood_inventory
WHERE donationId IS NULL AND status = 'active';

-- Show inventory summary by organization
SELECT 
    o.name AS organization_name,
    o.city,
    COUNT(bi.id) AS total_inventory_items,
    SUM(bi.units) AS total_units
FROM organizations o
LEFT JOIN blood_inventory bi ON o.id = bi.organizationId AND bi.status = 'active'
WHERE o.isActive = TRUE
GROUP BY o.id, o.name, o.city
ORDER BY o.name;

-- Show inventory by blood group and donation type for first organization (example)
SELECT 
    o.name AS organization_name,
    bi.bloodGroup,
    bi.donationType,
    bi.units,
    bi.expirationDate,
    bi.status
FROM organizations o
JOIN blood_inventory bi ON o.id = bi.organizationId
WHERE o.isActive = TRUE
  AND bi.status = 'active'
  AND bi.donationId IS NULL
ORDER BY o.name, bi.bloodGroup, bi.donationType
LIMIT 100;

-- ============================================
-- Notes
-- ============================================
-- This script creates 64 inventory entries per organization (8 blood types × 8 donation types)
-- Each entry has 1 unit with appropriate expiration dates based on donation type
-- 
-- Expiration dates:
-- - Whole Blood: 42 days
-- - Plasma: 365 days (1 year)
-- - Red Blood Cells: 42 days
-- - Platelets: 5 days
-- - Double Red Cells: 42 days
-- - Cryo: 365 days (1 year)
-- - White Cells: 1 day
-- - Granulocytes: 1 day
--
-- If inventory already exists for a combination, it will be updated to ensure at least 1 unit
-- (ON DUPLICATE KEY UPDATE ensures no duplicates based on unique constraint)

