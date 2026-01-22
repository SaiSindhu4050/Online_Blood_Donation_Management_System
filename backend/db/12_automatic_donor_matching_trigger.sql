-- ============================================
-- Migration: Automatic Donor Matching Trigger
-- Description: Automatically finds and links potential donors when a new request is created
-- Date: 2024
-- ============================================

USE blood_donation_db;

-- ============================================
-- Helper Function: Get Compatible Blood Groups
-- ============================================
-- Note: MySQL doesn't support functions that return arrays easily,
-- so we'll use a stored procedure instead

DELIMITER $$

-- ============================================
-- Stored Procedure: Find and Match Potential Donors
-- ============================================
-- This procedure finds compatible donors for a given request and optionally
-- inserts them into the RequestDonors table
DROP PROCEDURE IF EXISTS FindPotentialDonorsForRequest$$

CREATE PROCEDURE FindPotentialDonorsForRequest(
    IN p_requestId INT,
    IN p_bloodGroup VARCHAR(5),
    IN p_city VARCHAR(100),
    IN p_autoLink BOOLEAN
)
BEGIN
    DECLARE v_fiftySixDaysAgo DATE;
    DECLARE v_donorCount INT DEFAULT 0;
    
    -- Calculate date 56 days ago
    SET v_fiftySixDaysAgo = DATE_SUB(CURDATE(), INTERVAL 56 DAY);
    
    -- Determine compatible blood groups based on recipient blood group
    -- Based on official blood compatibility: Can RECEIVE Blood From
    -- O- can only receive from O-
    -- O+ can receive from O+, O-
    -- A- can receive from A-, O-
    -- A+ can receive from A+, A-, O+, O-
    -- B- can receive from B-, O-
    -- B+ can receive from B+, B-, O+, O-
    -- AB- can receive from AB-, A-, B-, O-
    -- AB+ can receive from everyone (Universal Recipient)
    
    -- Create a temporary table to store compatible blood groups
    DROP TEMPORARY TABLE IF EXISTS temp_compatible_groups;
    CREATE TEMPORARY TABLE temp_compatible_groups (
        bloodGroup VARCHAR(5)
    );
    
    -- Insert compatible blood groups based on recipient blood group
    IF p_bloodGroup = 'O-' THEN
        INSERT INTO temp_compatible_groups VALUES ('O-');
    ELSEIF p_bloodGroup = 'O+' THEN
        INSERT INTO temp_compatible_groups VALUES ('O+'), ('O-');
    ELSEIF p_bloodGroup = 'A-' THEN
        INSERT INTO temp_compatible_groups VALUES ('A-'), ('O-');
    ELSEIF p_bloodGroup = 'A+' THEN
        INSERT INTO temp_compatible_groups VALUES ('A+'), ('A-'), ('O+'), ('O-');
    ELSEIF p_bloodGroup = 'B-' THEN
        INSERT INTO temp_compatible_groups VALUES ('B-'), ('O-');
    ELSEIF p_bloodGroup = 'B+' THEN
        INSERT INTO temp_compatible_groups VALUES ('B+'), ('B-'), ('O+'), ('O-');
    ELSEIF p_bloodGroup = 'AB-' THEN
        INSERT INTO temp_compatible_groups VALUES ('AB-'), ('A-'), ('B-'), ('O-');
    ELSEIF p_bloodGroup = 'AB+' THEN
        INSERT INTO temp_compatible_groups VALUES ('AB+'), ('AB-'), ('A+'), ('A-'), ('B+'), ('B-'), ('O+'), ('O-');
    END IF;
    
    -- Find potential donors matching ALL criteria:
    -- 1. bloodGroup is in the compatible list
    -- 2. city matches the request's HOSPITAL city (using LIKE for partial matches)
    --    Note: p_city parameter should now be hospitalCity, not requestor city
    -- 3. lastDonationAt is either NULL or > 56 days ago
    -- 4. User is active
    
    -- Count matching donors (matching by hospital city)
    SELECT COUNT(*) INTO v_donorCount
    FROM users u
    INNER JOIN temp_compatible_groups tcg ON u.bloodGroup = tcg.bloodGroup
    WHERE u.city LIKE CONCAT('%', p_city, '%')  -- p_city should be hospitalCity
      AND u.isActive = TRUE
      AND (u.lastDonationAt IS NULL OR u.lastDonationAt <= v_fiftySixDaysAgo);
    
    -- If autoLink is true, insert matching donors into RequestDonors table
    IF p_autoLink = TRUE THEN
        INSERT INTO RequestDonors (requestId, userId, createdAt, updatedAt)
        SELECT 
            p_requestId,
            u.id,
            NOW(),
            NOW()
        FROM users u
        INNER JOIN temp_compatible_groups tcg ON u.bloodGroup = tcg.bloodGroup
        WHERE u.city LIKE CONCAT('%', p_city, '%')  -- p_city should be hospitalCity
          AND u.isActive = TRUE
          AND (u.lastDonationAt IS NULL OR u.lastDonationAt <= v_fiftySixDaysAgo)
          AND NOT EXISTS (
              SELECT 1 
              FROM RequestDonors rd 
              WHERE rd.requestId = p_requestId AND rd.userId = u.id
          )
        ORDER BY u.lastDonationAt ASC, u.id ASC
        LIMIT 50; -- Limit to prevent too many matches
    END IF;
    
    -- Clean up temporary table
    DROP TEMPORARY TABLE IF EXISTS temp_compatible_groups;
    
    -- Return the count
    SELECT v_donorCount AS potentialDonorsFound;
END$$

DELIMITER ;

-- ============================================
-- Trigger: After Request Insert
-- ============================================
-- This trigger automatically finds potential donors when a new request is created
-- Note: The trigger calls the stored procedure but doesn't auto-link by default
-- (set autoLink to FALSE to just count, TRUE to auto-link)
DROP TRIGGER IF EXISTS after_request_insert$$

DELIMITER $$

CREATE TRIGGER after_request_insert
AFTER INSERT ON requests
FOR EACH ROW
BEGIN
    -- Call the stored procedure to find potential donors
    -- Set autoLink to FALSE to avoid automatic linking (application layer handles this)
    -- Set to TRUE if you want automatic linking in the database
    CALL FindPotentialDonorsForRequest(
        NEW.id,
        NEW.bloodGroup,
        NEW.city,
        FALSE  -- Don't auto-link, just for reference/logging
    );
END$$

DELIMITER ;

-- ============================================
-- Verification Queries
-- ============================================

-- Test the stored procedure manually:
-- CALL FindPotentialDonorsForRequest(1, 'A+', 'New York', FALSE);

-- Check if trigger was created:
-- SHOW TRIGGERS WHERE `Table` = 'requests';

-- Check if procedure was created:
-- SHOW PROCEDURE STATUS WHERE Db = 'blood_donation_db' AND Name = 'FindPotentialDonorsForRequest';

-- ============================================
-- Notes:
-- ============================================
-- 1. The trigger is set to NOT auto-link donors (autoLink = FALSE)
--    This is because the application layer (controller) handles the matching logic
--    and provides more flexibility and better error handling.
--
-- 2. To enable automatic linking, change FALSE to TRUE in the trigger.
--    However, this is NOT recommended as it bypasses application-level validation.
--
-- 3. The stored procedure can be called manually from the application or
--    from MySQL to find potential donors for any request.
--
-- 4. The procedure limits matches to 50 donors to prevent performance issues.
--
-- 5. The procedure checks for existing links to avoid duplicates.
