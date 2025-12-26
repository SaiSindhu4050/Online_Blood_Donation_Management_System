USE blood_donation_db;

DELIMITER $$

CREATE PROCEDURE ApproveRequestAndDeductFromInventory(
    IN p_requestId INT,
    IN p_organizationId INT
)
BEGIN
    DECLARE v_bloodGroup VARCHAR(10);
    DECLARE v_donationType VARCHAR(50);
    DECLARE v_unitsRequired INT;
    DECLARE v_availableUnits INT DEFAULT 0;
    DECLARE v_inventoryId INT;
    DECLARE v_currentUnits INT;
    DECLARE v_remainingUnits INT;

    /* Ensure request exists */
    SELECT bloodGroup, donationType, unitsRequired
    INTO v_bloodGroup, v_donationType, v_unitsRequired
    FROM requests
    WHERE id = p_requestId;

    IF v_bloodGroup IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Request not found.';
    END IF;

    /* Check inventory */
    SELECT COALESCE(SUM(units), 0)
    INTO v_availableUnits
    FROM blood_inventory
    WHERE organizationId = p_organizationId
      AND bloodGroup = v_bloodGroup
      AND donationType = v_donationType
      AND status = 'active'
      AND expirationDate > CURDATE();

    IF v_availableUnits < v_unitsRequired THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = CONCAT(
                'Insufficient inventory. Available: ',
                v_availableUnits,
                ' units, Required: ',
                v_unitsRequired
            );
    END IF;

    /* Update request status */
    UPDATE requests
    SET status = 'fulfilled', updatedAt = NOW()
    WHERE id = p_requestId;

    /* FIFO Deduction Loop */
    deduct_loop: WHILE v_unitsRequired > 0 DO
        
        /* Fetch oldest inventory row */
        SELECT id, units
        INTO v_inventoryId, v_currentUnits
        FROM blood_inventory
        WHERE organizationId = p_organizationId
          AND bloodGroup = v_bloodGroup
          AND donationType = v_donationType
          AND status = 'active'
          AND expirationDate > CURDATE()
          AND units > 0
        ORDER BY expirationDate ASC, id ASC
        LIMIT 1;

        /* If no inventory left, break */
        IF v_inventoryId IS NULL THEN
            LEAVE deduct_loop;
        END IF;

        /* Deduction */
        SET v_remainingUnits = v_currentUnits - v_unitsRequired;

        IF v_remainingUnits <= 0 THEN
            /* Use entire record */
            UPDATE blood_inventory
            SET units = 0, status = 'used', updatedAt = NOW()
            WHERE id = v_inventoryId;

            SET v_unitsRequired = ABS(v_remainingUnits);
        ELSE
            /* Partial deduction */
            UPDATE blood_inventory
            SET units = v_remainingUnits, updatedAt = NOW()
            WHERE id = v_inventoryId;

            SET v_unitsRequired = 0;
        END IF;

    END WHILE deduct_loop;

    /* Cleanup zero-unit items */
    DELETE FROM blood_inventory
    WHERE organizationId = p_organizationId
      AND units <= 0;

    SELECT 'Request fulfilled and inventory deducted successfully' AS message;

END$$

DELIMITER ;
