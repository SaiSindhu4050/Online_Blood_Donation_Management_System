-- ============================================
-- Migration: Automated Inventory Triggers
-- Description: Automatically updates blood inventory when donations are approved or requests are fulfilled
-- Date: 2024
-- ============================================

USE blood_donation_db;

DELIMITER $$

-- ============================================
-- Trigger 1: after_donation_completion
-- ============================================
-- Fires AFTER UPDATE on donations table
-- When a donation status changes to 'completed', automatically adds blood to inventory
-- Note: Inventory is added when donation is completed (actual donation happened),
-- not when it's approved (just scheduled)
DROP TRIGGER IF EXISTS after_donation_approval$$
DROP TRIGGER IF EXISTS after_donation_completion$$

CREATE TRIGGER after_donation_completion
AFTER UPDATE ON donations
FOR EACH ROW
BEGIN
    DECLARE v_organizationId INT DEFAULT NULL;
    DECLARE v_expirationDate DATE;
    DECLARE v_donationType VARCHAR(50);
    DECLARE v_units INT DEFAULT 1;
    DECLARE v_existingInventoryId INT;
    DECLARE v_existingUnits INT;
    
    -- Only process if status changed from non-completed to 'completed'
    -- This ensures inventory is only added when the actual donation happens
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        
        -- Note: Donations table doesn't have donationType column
        -- Default to 'Whole Blood' with 42 days expiration (standard for whole blood donations)
        SET v_donationType = 'Whole Blood';
        SET v_expirationDate = DATE_ADD(CURDATE(), INTERVAL 42 DAY);
        
        -- Find organization ID from donation
        -- Priority: 1. eventId -> events -> organizationId
        --           2. selectedOrganization (name) -> organizations -> id
        
        -- Try to get organization from event first
        IF NEW.eventId IS NOT NULL THEN
            SELECT organizationId INTO v_organizationId
            FROM events
            WHERE id = NEW.eventId
            LIMIT 1;
        END IF;
        
        -- If not found via event, try to find by selectedOrganization name
        IF v_organizationId IS NULL AND NEW.selectedOrganization IS NOT NULL THEN
            SELECT id INTO v_organizationId
            FROM organizations
            WHERE name = NEW.selectedOrganization
            LIMIT 1;
        END IF;
        
        -- Only proceed if we found an organization
        IF v_organizationId IS NOT NULL THEN
            -- Check if inventory record already exists for this combination
            -- (same organization, blood group, donation type, expiration date, and donation)
            SELECT id, units
            INTO v_existingInventoryId, v_existingUnits
            FROM blood_inventory
            WHERE organizationId = v_organizationId
              AND bloodGroup = NEW.bloodGroup
              AND donationType = v_donationType
              AND expirationDate = v_expirationDate
              AND (donationId = NEW.id OR donationId IS NULL)
              AND status = 'active'
            LIMIT 1;
            
            IF v_existingInventoryId IS NOT NULL THEN
                -- Update existing inventory record (increment units)
                UPDATE blood_inventory
                SET units = units + v_units,
                    updatedAt = NOW()
                WHERE id = v_existingInventoryId;
            ELSE
                -- Insert new inventory record
                INSERT INTO blood_inventory (
                    organizationId,
                    donationId,
                    bloodGroup,
                    donationType,
                    units,
                    expirationDate,
                    status,
                    createdAt,
                    updatedAt
                ) VALUES (
                    v_organizationId,
                    NEW.id,
                    NEW.bloodGroup,
                    v_donationType,
                    v_units,
                    v_expirationDate,
                    'active',
                    NOW(),
                    NOW()
                );
            END IF;
        END IF;
    END IF;
END$$

-- ============================================
-- Trigger 2: after_request_fulfillment
-- ============================================
-- Fires AFTER UPDATE on requests table
-- When a request status changes to 'fulfilled', automatically decrements blood from inventory
-- Note: This trigger finds an organization in the request's city with sufficient inventory
-- and deducts using FIFO (First In First Out) method
-- 
-- Important: In production, you might want to track which organization fulfilled the request
-- by adding a `fulfilledByOrganizationId` column to the requests table

DROP TRIGGER IF EXISTS after_request_fulfillment$$

CREATE TRIGGER after_request_fulfillment
AFTER UPDATE ON requests
FOR EACH ROW
BEGIN
    DECLARE v_organizationId INT DEFAULT NULL;
    DECLARE v_bloodGroup VARCHAR(10);
    DECLARE v_donationType VARCHAR(50);
    DECLARE v_unitsRequired INT;
    DECLARE v_inventoryId INT;
    DECLARE v_currentUnits INT;
    DECLARE v_remainingUnits INT;
    DECLARE done INT DEFAULT FALSE;
    
    -- Only process if status changed to 'fulfilled'
    IF NEW.status = 'fulfilled' AND (OLD.status IS NULL OR OLD.status != 'fulfilled') THEN
        
        SET v_bloodGroup = NEW.bloodGroup;
        SET v_donationType = COALESCE(NEW.donationType, 'Whole Blood');
        SET v_unitsRequired = NEW.unitsRequired;
        
        -- Find an organization in the request's city that has sufficient inventory
        -- We'll use the first organization found in that city with enough units
        SELECT o.id INTO v_organizationId
        FROM organizations o
        INNER JOIN blood_inventory bi ON o.id = bi.organizationId
        WHERE o.city = NEW.city
          AND bi.bloodGroup = v_bloodGroup
          AND bi.donationType = v_donationType
          AND bi.status = 'active'
          AND bi.expirationDate > CURDATE()
          AND bi.units > 0
        GROUP BY o.id
        HAVING SUM(bi.units) >= v_unitsRequired
        ORDER BY SUM(bi.units) DESC
        LIMIT 1;
        
        -- If organization found, deduct inventory using FIFO
        IF v_organizationId IS NOT NULL THEN
            deduct_loop: WHILE v_unitsRequired > 0 DO
                
                -- Get oldest inventory item (FIFO)
                SELECT id, units
                INTO v_inventoryId, v_currentUnits
                FROM blood_inventory
                WHERE organizationId = v_organizationId
                  AND bloodGroup = v_bloodGroup
                  AND donationType = v_donationType
                  AND status = 'active'
                  AND expirationDate > CURDATE()
                  AND units > 0
                ORDER BY expirationDate ASC, id ASC
                LIMIT 1;
                
                -- If no inventory left, break
                IF v_inventoryId IS NULL THEN
                    LEAVE deduct_loop;
                END IF;
                
                -- Calculate remaining units after deduction
                SET v_remainingUnits = v_currentUnits - v_unitsRequired;
                
                IF v_remainingUnits <= 0 THEN
                    -- Fully consume this inventory item
                    UPDATE blood_inventory
                    SET units = 0,
                        status = 'used',
                        updatedAt = NOW()
                    WHERE id = v_inventoryId;
                    
                    SET v_unitsRequired = ABS(v_remainingUnits);
                ELSE
                    -- Partially consume this inventory item
                    UPDATE blood_inventory
                    SET units = v_remainingUnits,
                        updatedAt = NOW()
                    WHERE id = v_inventoryId;
                    
                    SET v_unitsRequired = 0;
                END IF;
                
            END WHILE deduct_loop;
            
            -- Cleanup zero-unit items
            DELETE FROM blood_inventory
            WHERE organizationId = v_organizationId
              AND units <= 0;
        END IF;
    END IF;
END$$

DELIMITER ;

-- ============================================
-- Verification Queries
-- ============================================

-- Check if triggers were created
-- SHOW TRIGGERS WHERE `Table` = 'donations';
-- SHOW TRIGGERS WHERE `Table` = 'requests';

-- Test the donation completion trigger:
-- 1. Create a test donation
-- 2. Update its status to 'completed'
-- 3. Check blood_inventory table

-- Test the request fulfillment trigger:
-- 1. Create a test request
-- 2. Ensure there's inventory available
-- 3. Update request status to 'fulfilled'
-- 4. Check blood_inventory table

-- ============================================
-- Notes:
-- ============================================
-- 1. The donation completion trigger automatically:
--    - Finds the organization (via eventId or selectedOrganization)
--    - Calculates expiration date based on donation type (default: 42 days for Whole Blood)
--    - Inserts or increments inventory record
--    - Only fires when donation status changes to 'completed' (actual donation happened)
--
-- 2. The request fulfillment trigger:
--    - Finds an organization in the request's city with sufficient inventory
--    - Deducts inventory using FIFO (First In First Out)
--    - Marks inventory items as 'used' when fully consumed
--    - Cleans up zero-unit items
--
-- 3. Important considerations:
--    - The request fulfillment trigger uses a simplified approach (first available org in city)
--    - In production, you might want to track which organization fulfilled which request
--    - Consider adding a `fulfilledByOrganizationId` column to requests table
--    - The trigger uses cursors which may have performance implications for large datasets
--
-- 4. Error handling:
--    - Triggers don't have extensive error handling
--    - If organization not found, inventory won't be updated (silent failure)
--    - Consider adding logging or error tables for production use
--
-- 5. Performance:
--    - Triggers execute synchronously and can slow down updates
--    - For high-volume systems, consider using background jobs instead
--    - Indexes on blood_inventory table are important for trigger performance
