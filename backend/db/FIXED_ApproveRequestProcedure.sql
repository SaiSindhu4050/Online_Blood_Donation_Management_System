-- ============================================
-- FIXED VERSION: ApproveRequestAndDeductFromInventory
-- ============================================
-- This version fixes the SIGNAL syntax issue
-- Copy EVERYTHING from "USE blood_donation_db;" to "DELIMITER ;"
-- ============================================

USE blood_donation_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS ApproveRequestAndDeductFromInventory;

CREATE PROCEDURE ApproveRequestAndDeductFromInventory(
    IN p_requestId INT,
    IN p_organizationId INT
)
BEGIN
    DECLARE v_bloodGroup VARCHAR(10);
    DECLARE v_donationType VARCHAR(50);
    DECLARE v_unitsRequired INT;
    DECLARE v_availableUnits INT;
    DECLARE v_inventoryId INT;
    DECLARE v_currentUnits INT;
    DECLARE v_remainingUnits INT;
    
    -- Get request details
    SELECT bloodGroup, donationType, unitsRequired 
    INTO v_bloodGroup, v_donationType, v_unitsRequired
    FROM requests 
    WHERE id = p_requestId;
    
    -- Check if organization has enough inventory
    SELECT COALESCE(SUM(units), 0) INTO v_availableUnits
    FROM blood_inventory
    WHERE organizationId = p_organizationId
      AND bloodGroup = v_bloodGroup
      AND donationType = v_donationType
      AND status = 'active'
      AND expirationDate > CURDATE();
    
    -- If not enough inventory, signal error
    IF v_availableUnits < v_unitsRequired THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = CONCAT('Insufficient inventory. Available: ', v_availableUnits, ' units, Required: ', v_unitsRequired, ' units.');
    END IF;
    
    -- Update request status to fulfilled
    UPDATE requests
    SET 
        status = 'fulfilled',
        updatedAt = NOW()
    WHERE id = p_requestId;
    
    -- Deduct from inventory using FIFO (First In First Out - oldest expiration first)
    -- Process until all required units are deducted
    WHILE v_unitsRequired > 0 DO
        -- Get the oldest inventory item
        SELECT id, units INTO v_inventoryId, v_currentUnits
        FROM blood_inventory
        WHERE organizationId = p_organizationId
          AND bloodGroup = v_bloodGroup
          AND donationType = v_donationType
          AND status = 'active'
          AND expirationDate > CURDATE()
          AND units > 0
        ORDER BY expirationDate ASC
        LIMIT 1;
        
        -- If no more inventory found, break
        IF v_inventoryId IS NULL THEN
            LEAVE;
        END IF;
        
        -- Calculate remaining units after deduction
        SET v_remainingUnits = v_currentUnits - v_unitsRequired;
        
        IF v_remainingUnits <= 0 THEN
            -- Mark this inventory item as used (fully consumed)
            UPDATE blood_inventory
            SET 
                units = 0,
                status = 'used',
                updatedAt = NOW()
            WHERE id = v_inventoryId;
            
            SET v_unitsRequired = ABS(v_remainingUnits);
        ELSE
            -- Partially deduct from this inventory item (decrement)
            UPDATE blood_inventory
            SET 
                units = v_remainingUnits,
                updatedAt = NOW()
            WHERE id = v_inventoryId;
            
            SET v_unitsRequired = 0;
        END IF;
    END WHILE;
    
    -- Clean up inventory items with zero units (trigger will handle this, but ensure cleanup)
    DELETE FROM blood_inventory
    WHERE organizationId = p_organizationId
      AND units <= 0;
    
    SELECT 'Request fulfilled and inventory deducted successfully' AS message;
END$$

DELIMITER ;












