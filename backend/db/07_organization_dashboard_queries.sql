-- ============================================
-- Blood Donation Management System
-- Organization Dashboard Queries for OrganizationDashboard.jsx Functionality
-- ============================================
-- 
-- IMPORTANT NOTES:
-- 1. Queries with ? placeholders are for prepared statements (application code)
-- 2. For direct MySQL execution, replace ?placeholders with actual values
-- 3. Example values are provided in comments for direct execution
-- 4. Your backend uses Sequelize ORM which handles placeholders automatically
--
-- ============================================

USE blood_donation_db;

-- ============================================
-- CREATE BLOOD INVENTORY TABLE (if not exists)
-- ============================================
-- This table tracks blood inventory for organizations
-- Used by: OrganizationDashboard.jsx - storage tab

CREATE TABLE IF NOT EXISTS blood_inventory (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    donationId INT NULL,
    bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    donationType ENUM('Whole Blood', 'Plasma', 'Red Blood Cells', 'Platelets', 'Double Red Cells', 'Cryo', 'White Cells', 'Granulocytes') NOT NULL DEFAULT 'Whole Blood',
    units INT NOT NULL CHECK (units > 0),
    expirationDate DATE NOT NULL,
    status ENUM('active', 'expired', 'used', 'discarded') DEFAULT 'active',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE SET NULL,
    UNIQUE KEY unique_org_blood_type_expiration (organizationId, bloodGroup, donationType, expirationDate, donationId),
    INDEX idx_organizationId (organizationId),
    INDEX idx_bloodGroup (bloodGroup),
    INDEX idx_donationType (donationType),
    INDEX idx_expirationDate (expirationDate),
    INDEX idx_status (status),
    INDEX idx_donationId (donationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 1. GET ORGANIZATION PROFILE
-- ============================================
-- This query retrieves organization profile information
-- Used by: authAPI.getMe() and organizationAPI.getProfile()
-- Corresponds to: OrganizationDashboard.jsx - loading organization data

-- For prepared statements: WHERE id = ?
-- For direct execution: Replace ?organizationId with actual organization ID
SELECT 
    id,
    name,
    email,
    phone,
    address,
    city,
    state,
    zipCode,
    description,
    website,
    isVerified,
    isActive,
    createdAt,
    updatedAt
FROM organizations
WHERE id = 1;  -- Replace 1 with actual organization ID

-- Example:
-- SELECT * FROM organizations WHERE id = 1;

-- ============================================
-- 2. GET ORGANIZATION DASHBOARD DATA
-- ============================================
-- This query retrieves comprehensive dashboard data for an organization
-- Used by: organizationAPI.getDashboard()
-- Corresponds to: OrganizationDashboard.jsx - initial data loading

-- 2a. Get organization with statistics
SELECT 
    o.id,
    o.name,
    o.email,
    o.phone,
    o.address,
    o.city,
    o.state,
    o.zipCode,
    o.description,
    o.website,
    o.isVerified,
    o.isActive,
    o.createdAt,
    o.updatedAt,
    (SELECT COUNT(*) FROM events WHERE organizationId = o.id) AS totalEvents,
    (SELECT COUNT(*) FROM events WHERE organizationId = o.id AND status = 'upcoming') AS upcomingEvents,
    (SELECT COUNT(*) FROM donations WHERE selectedOrganization = o.name AND status = 'pending') AS pendingDonations,
    (SELECT COUNT(*) FROM donations WHERE selectedOrganization = o.name AND status = 'completed') AS totalDonations,
    (SELECT COUNT(*) FROM requests WHERE status = 'pending') AS pendingRequests
FROM organizations o
WHERE o.id = 1;  -- Replace 1 with actual organization ID

-- 2b. Get recent events for organization (last 10)
SELECT 
    e.id,
    e.organizationId,
    e.name,
    e.description,
    e.eventDate,
    e.eventEndDate,
    e.isMultiDay,
    e.startTime,
    e.endTime,
    e.location_address,
    e.location_city,
    e.location_state,
    e.location_zip_code,
    e.targetBloodGroups,
    e.targetUnits,
    e.status,
    e.createdAt,
    e.updatedAt,
    (SELECT COUNT(*) FROM donations WHERE eventId = e.id) AS registrationCount
FROM events e
WHERE e.organizationId = 1  -- Replace 1 with actual organization ID
ORDER BY e.eventDate DESC
LIMIT 10;

-- 2c. Get recent donations for organization (last 10)
SELECT 
    d.id,
    d.userId,
    d.userEmail,
    d.fullName,
    d.email,
    d.phone,
    d.bloodGroup,
    d.selectedOrganization,
    d.eventId,
    d.eventName,
    d.eventDate,
    d.status,
    d.createdAt,
    d.updatedAt
FROM donations d
WHERE d.selectedOrganization = (SELECT name FROM organizations WHERE id = 1)  -- Replace 1 with actual organization ID
ORDER BY d.createdAt DESC
LIMIT 10;

-- ============================================
-- 3. GET PENDING DONATIONS FOR ORGANIZATION
-- ============================================
-- This query gets pending donations for organization approval
-- Used by: OrganizationDashboard.jsx - donations tab
-- Corresponds to: donationAPI.getAllDonations({ organizationId })

SELECT 
    d.id,
    d.userId,
    d.userEmail,
    d.fullName,
    d.email,
    d.phone,
    d.age,
    d.bloodGroup,
    d.address,
    d.city,
    d.state,
    d.zipCode,
    d.lastDonationDate,
    d.medicalConditions,
    d.preferredDate,
    d.preferredTime,
    d.selectedOrganization,
    d.eventId,
    d.eventName,
    d.eventDate,
    d.status,
    d.scheduledDate,
    d.scheduledTime,
    d.createdAt,
    d.updatedAt,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.selectedOrganization = (SELECT name FROM organizations WHERE id = 1)  -- Replace 1 with actual organization ID
  AND d.status = 'pending'
ORDER BY d.createdAt DESC;

-- ============================================
-- 4. APPROVE DONATION (WITH AUTOMATIC INVENTORY INCREMENT)
-- ============================================
-- This stored procedure approves a donation and automatically adds it to inventory
-- Used by: OrganizationDashboard.jsx - handleConfirmApproval()
-- Corresponds to: donationAPI.updateDonationStatus()

-- 4a. Stored Procedure: Approve donation and add to inventory automatically
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS ApproveDonationAndAddToInventory(
    IN p_donationId INT,
    IN p_organizationId INT,
    IN p_donationType VARCHAR(50),
    IN p_units INT,
    IN p_expirationDate DATE
)
BEGIN
    DECLARE v_bloodGroup VARCHAR(10);
    DECLARE v_orgName VARCHAR(255);
    DECLARE v_calculatedExpiration DATE;
    
    -- Get blood group and organization name
    SELECT bloodGroup INTO v_bloodGroup FROM donations WHERE id = p_donationId;
    SELECT name INTO v_orgName FROM organizations WHERE id = p_organizationId;
    
    -- Calculate expiration date if not provided
    IF p_expirationDate IS NULL THEN
        SET v_calculatedExpiration = DATE_ADD(CURDATE(), INTERVAL 
            CASE p_donationType
                WHEN 'Plasma' THEN 365
                WHEN 'Platelets' THEN 5
                WHEN 'Cryo' THEN 365
                WHEN 'White Cells' THEN 1
                WHEN 'Granulocytes' THEN 1
                ELSE 42  -- Whole Blood, Red Blood Cells, Double Red Cells
            END DAY
        );
    ELSE
        SET v_calculatedExpiration = p_expirationDate;
    END IF;
    
    -- Update donation status to approved
    UPDATE donations
    SET 
        status = 'approved',
        updatedAt = NOW()
    WHERE id = p_donationId
      AND selectedOrganization = v_orgName;
    
    -- Check if inventory item with same blood group, type, and expiration exists
    -- If exists, increment units; otherwise, insert new record
    SET @existing_id = NULL;
    SELECT id INTO @existing_id
    FROM blood_inventory
    WHERE organizationId = p_organizationId
      AND bloodGroup = v_bloodGroup
      AND donationType = p_donationType
      AND expirationDate = v_calculatedExpiration
      AND status = 'active'
    LIMIT 1;
    
    IF @existing_id IS NOT NULL THEN
        -- Increment existing inventory (batch addition)
        UPDATE blood_inventory
        SET 
            units = units + p_units,
            updatedAt = NOW()
        WHERE id = @existing_id;
    ELSE
        -- Insert new inventory record
        INSERT INTO blood_inventory (
            organizationId,
            donationId,
            bloodGroup,
            donationType,
            units,
            expirationDate,
            status
        ) VALUES (
            p_organizationId,
            p_donationId,
            v_bloodGroup,
            p_donationType,
            p_units,
            v_calculatedExpiration,
            'active'
        );
    END IF;
    
END$$

DELIMITER ;

-- 4b. Simple query version (for direct use without stored procedure)
-- Update donation status to approved
UPDATE donations
SET 
    status = 'approved',
    updatedAt = NOW()
WHERE id = 1  -- Replace 1 with actual donation ID
  AND selectedOrganization = (SELECT name FROM organizations WHERE id = 1);  -- Replace 1 with actual organization ID

-- Add blood to inventory automatically (increment)
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
-- 
-- IMPORTANT: Before running this query, you MUST have:
-- 1. At least one organization in the organizations table
-- 2. At least one donation in the donations table (optional, but recommended)
-- 
-- Step 1: Check if organization exists (run this first)
SELECT id, name FROM organizations LIMIT 1;  -- If this returns no rows, create an organization first

-- Step 2: Check if donation exists (optional)
SELECT id, bloodGroup FROM donations LIMIT 1;  -- If this returns no rows, donationId can be NULL

-- Step 3: If no organizations exist, create one first:
-- INSERT INTO organizations (name, email, phone, address, city, state, zipCode, isActive)
-- VALUES ('Test Organization', 'test@example.com', '+1234567890', '123 Main St', 'New York', 'NY', '10001', TRUE);

-- Step 4: Insert into inventory (use actual IDs from steps 1 and 2, or use the version below with direct values)
-- Version A: Using subqueries (only works if organizations and donations exist)
INSERT INTO blood_inventory (
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status
) 
SELECT 
    COALESCE((SELECT id FROM organizations LIMIT 1), 1) AS organizationId,  -- Use first org or fallback to 1
    (SELECT id FROM donations LIMIT 1) AS donationId,  -- Can be NULL if no donations
    COALESCE((SELECT bloodGroup FROM donations LIMIT 1), 'O+') AS bloodGroup,  -- Get from donation or use 'O+'
    'Whole Blood' AS donationType,  -- Replace 'Whole Blood' with actual donation type
    1 AS units,  -- Replace 1 with actual units
    DATE_ADD(CURDATE(), INTERVAL 
        CASE 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
            WHEN 'Plasma' THEN 365
            WHEN 'Platelets' THEN 5
            WHEN 'Cryo' THEN 365
            WHEN 'White Cells' THEN 1
            WHEN 'Granulocytes' THEN 1
            ELSE 42
        END DAY
    ) AS expirationDate,
    'active' AS status
WHERE EXISTS (SELECT 1 FROM organizations LIMIT 1)  -- Only insert if organization exists
ON DUPLICATE KEY UPDATE
    units = units + 1,  -- Replace 1 with actual units
    updatedAt = NOW();

-- Alternative: Direct values (if you know the blood group):
-- INSERT INTO blood_inventory (
--     organizationId, donationId, bloodGroup, donationType, units, expirationDate, status
-- ) VALUES (
--     1, 1, 'O+', 'Whole Blood', 1, DATE_ADD(CURDATE(), INTERVAL 42 DAY), 'active'
-- )
-- ON DUPLICATE KEY UPDATE
--     units = units + 1, updatedAt = NOW();

-- Example using stored procedure:
-- CALL ApproveDonationAndAddToInventory(1, 1, 'Whole Blood', 1, NULL);

-- Example using direct queries:
-- UPDATE donations SET status = 'approved', updatedAt = NOW() WHERE id = 1;
-- INSERT INTO blood_inventory (organizationId, donationId, bloodGroup, donationType, units, expirationDate, status)
-- VALUES (1, 1, 'O+', 'Whole Blood', 1, DATE_ADD(CURDATE(), INTERVAL 42 DAY), 'active');

-- ============================================
-- 5. DENY DONATION
-- ============================================
-- This query denies a donation request
-- Used by: OrganizationDashboard.jsx - handleDenyDonation()
-- Corresponds to: donationAPI.updateDonationStatus()

UPDATE donations
SET 
    status = 'cancelled',
    updatedAt = NOW()
WHERE id = 1  -- Replace 1 with actual donation ID
  AND selectedOrganization = (SELECT name FROM organizations WHERE id = 1);  -- Replace 1 with actual organization ID

-- Example:
-- UPDATE donations SET status = 'cancelled', updatedAt = NOW() WHERE id = 1;

-- ============================================
-- 6. GET PENDING REQUESTS FOR ORGANIZATION
-- ============================================
-- This query gets pending blood requests
-- Used by: OrganizationDashboard.jsx - requests tab
-- Note: Requests are typically city-based, not organization-specific

SELECT 
    r.id,
    r.userId,
    r.userEmail,
    r.requestType,
    r.patientName,
    r.contactPerson,
    r.email,
    r.phone,
    r.bloodGroup,
    r.donationType,
    r.unitsRequired,
    r.urgency,
    r.requiredDate,
    r.hospitalName,
    r.hospitalAddress,
    r.city,
    r.state,
    r.zipCode,
    r.patientCondition,
    r.doctorName,
    r.doctorContact,
    r.status,
    r.createdAt,
    r.updatedAt
FROM requests r
WHERE r.status = 'pending'
  AND r.city LIKE CONCAT('%', (SELECT city FROM organizations WHERE id = 1), '%')  -- Replace 1 with actual organization ID
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 7. APPROVE REQUEST (WITH AUTOMATIC INVENTORY DECREMENT)
-- ============================================
-- This stored procedure approves a blood request and automatically deducts from inventory
-- Used by: OrganizationDashboard.jsx - handleApproveRequest()
-- Corresponds to: requestAPI.updateRequestStatus()

-- 7a. Stored Procedure: Approve request and deduct from inventory automatically
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS ApproveRequestAndDeductFromInventory(
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
        SET MESSAGE_TEXT = 'Insufficient inventory. Available units do not meet the requirement.';
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
            -- Partially deduct from this inventory item
            UPDATE blood_inventory
            SET 
                units = v_remainingUnits,
                updatedAt = NOW()
            WHERE id = v_inventoryId;
            
            SET v_unitsRequired = 0;
        END IF;
    END WHILE;
    
    -- Clean up inventory items with zero units
    DELETE FROM blood_inventory
    WHERE organizationId = p_organizationId
      AND units <= 0;
    
END$$

DELIMITER ;

-- 7b. Check if organization has enough inventory
SELECT 
    SUM(units) AS availableUnits
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND donationType = 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
  AND status = 'active'
  AND expirationDate > CURDATE();

-- 7c. Simple query version (for direct use without stored procedure)
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
-- 
-- IMPORTANT: Run these queries separately (one at a time) or ensure proper semicolon separation

-- Step 1: Update request status to fulfilled
UPDATE requests
SET 
    status = 'fulfilled',
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual request ID

-- Step 2: Deduct from inventory (FIFO - First In First Out) - decrement
-- Note: This should be run after Step 1, and only if organization has enough inventory
UPDATE blood_inventory
SET 
    units = units - 2,  -- Replace 2 with actual units required
    status = CASE 
        WHEN units - 2 <= 0 THEN 'used'  -- Replace 2 with actual units required
        ELSE status
    END,
    updatedAt = NOW()
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND donationType = 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
  AND status = 'active'
  AND expirationDate > CURDATE()
  AND units >= 2  -- Replace 2 with actual units required
ORDER BY expirationDate ASC
LIMIT 1;

-- Example using stored procedure:
-- CALL ApproveRequestAndDeductFromInventory(1, 1);

-- ============================================
-- 8. DENY REQUEST
-- ============================================
-- This query denies a blood request
-- Used by: OrganizationDashboard.jsx - handleDenyRequest()
-- Corresponds to: requestAPI.updateRequestStatus()

-- For prepared statements: WHERE id = ?
-- For direct execution: Replace ?requestId with actual request ID
UPDATE requests
SET 
    status = 'cancelled',
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual request ID

-- ============================================
-- 9. CREATE EVENT
-- ============================================
-- This query creates a new blood donation event
-- Used by: OrganizationDashboard.jsx - handleCreateEvent()
-- Corresponds to: eventAPI.createEvent()
-- 
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
-- 
-- IMPORTANT: Before running this query, make sure:
-- 1. Organization exists: SELECT id, name FROM organizations WHERE id = 1;
-- 2. If no organization exists, create one first (see Step 1 below)

-- Step 1: Check if organization exists (run this first)
SELECT id, name FROM organizations LIMIT 1;  -- If this returns no rows, create an organization first

-- Step 2: If no organizations exist, create one first:
-- INSERT INTO organizations (name, email, phone, address, city, state, zipCode, isActive)
-- VALUES ('Test Organization', 'test@example.com', '+1234567890', '123 Main St', 'New York', 'NY', '10001', TRUE);

-- Step 3: Insert event (use subquery to get organization ID, or replace with actual ID)
INSERT INTO events (
    organizationId,
    name,
    description,
    eventDate,
    eventEndDate,
    isMultiDay,
    startTime,
    endTime,
    location_address,
    location_city,
    location_state,
    location_zip_code,
    targetBloodGroups,
    targetUnits,
    status
) 
SELECT 
    (SELECT id FROM organizations LIMIT 1) AS organizationId,  -- Use first available organization ID
    'Community Blood Drive' AS name,  -- Replace with actual event name
    'Annual community blood drive' AS description,  -- Replace with actual description
    '2024-12-20' AS eventDate,  -- Replace with actual event date
    '2024-12-20' AS eventEndDate,  -- Replace with actual event end date (or NULL)
    FALSE AS isMultiDay,  -- Replace with TRUE/FALSE for multi-day event
    '09:00' AS startTime,  -- Replace with actual start time
    '17:00' AS endTime,  -- Replace with actual end time
    '123 Main St' AS location_address,  -- Replace with actual address
    'New York' AS location_city,  -- Replace with actual city
    'NY' AS location_state,  -- Replace with actual state
    '10001' AS location_zip_code,  -- Replace with actual zip code
    JSON_ARRAY('O+', 'A+', 'B+') AS targetBloodGroups,  -- Replace with actual target blood groups (JSON array format)
    100 AS targetUnits,  -- Replace with actual target units
    'upcoming' AS status
WHERE EXISTS (SELECT 1 FROM organizations LIMIT 1);  -- Only insert if organization exists

-- Example with JSON array for targetBloodGroups:
-- INSERT INTO events (
--     organizationId, name, description, eventDate, startTime, endTime,
--     location_address, location_city, location_state, location_zip_code, 
--     targetBloodGroups, targetUnits, status
-- ) VALUES (
--     1, 'Community Blood Drive', 'Annual community blood drive', '2024-12-20 09:00:00',
--     '09:00', '17:00', '123 Main St', 'New York', 'NY', '10001',
--     JSON_ARRAY('O+', 'A+', 'B+'), 100, 'upcoming'
-- );



-- ============================================
-- 10. GET EVENTS FOR ORGANIZATION
-- ============================================
-- This query gets all events for an organization
-- Used by: OrganizationDashboard.jsx - events tab
-- Corresponds to: eventAPI.getAllEvents({ organizationId })

SELECT 
    e.id,
    e.organizationId,
    e.name,
    e.description,
    e.eventDate,
    e.eventEndDate,
    e.isMultiDay,
    e.startTime,
    e.endTime,
    e.location_address,
    e.location_city,
    e.location_state,
    e.location_zip_code,
    e.targetBloodGroups,
    e.targetUnits,
    e.status,
    e.createdAt,
    e.updatedAt,
    (SELECT COUNT(*) FROM donations WHERE eventId = e.id) AS registrationCount
FROM events e
WHERE e.organizationId = 1  -- Replace 1 with actual organization ID
ORDER BY e.eventDate DESC;

-- ============================================
-- 11. GET EVENT REGISTRATIONS
-- ============================================
-- This query gets all registrations (donations) for an event
-- Used by: OrganizationDashboard.jsx - handleViewEventDetails()
-- Corresponds to: eventAPI.getEventRegistrations()

SELECT 
    d.id,
    d.userId,
    d.userEmail,
    d.fullName,
    d.email,
    d.phone,
    d.bloodGroup,
    d.eventId,
    d.eventName,
    d.eventDate,
    d.status,
    d.createdAt,
    d.updatedAt,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.phone AS user_phone
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.eventId = 1  -- Replace 1 with actual event ID
ORDER BY d.createdAt DESC;

-- ============================================
-- 12. DELETE EVENT
-- ============================================
-- This query deletes an event
-- Used by: OrganizationDashboard.jsx - delete event action
-- Corresponds to: eventAPI.deleteEvent()

DELETE FROM events
WHERE id = 1  -- Replace 1 with actual event ID
  AND organizationId = 1;  -- Replace 1 with actual organization ID

-- ============================================
-- 13. GET BLOOD INVENTORY
-- ============================================
-- This query gets blood inventory for an organization
-- Used by: OrganizationDashboard.jsx - storage tab

-- 13a. Get active inventory (not expired)
SELECT 
    id,
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status,
    createdAt,
    updatedAt,
    DATEDIFF(expirationDate, CURDATE()) AS daysUntilExpiration
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND status = 'active'
  AND expirationDate > CURDATE()
ORDER BY expirationDate ASC;

-- 13b. Get expired inventory
SELECT 
    id,
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status,
    createdAt,
    updatedAt,
    DATEDIFF(CURDATE(), expirationDate) AS daysExpired
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND (status = 'expired' OR expirationDate <= CURDATE())
ORDER BY expirationDate DESC;

-- 13c. Get inventory grouped by blood group and donation type
SELECT 
    bloodGroup,
    donationType,
    SUM(units) AS totalUnits,
    MIN(expirationDate) AS earliestExpiration,
    COUNT(*) AS batchCount
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND status = 'active'
  AND expirationDate > CURDATE()
GROUP BY bloodGroup, donationType
ORDER BY bloodGroup, donationType;

-- 13d. Get inventory summary statistics
SELECT 
    SUM(units) AS totalUnits,
    COUNT(DISTINCT bloodGroup) AS bloodTypesCount,
    COUNT(DISTINCT donationType) AS donationTypesCount,
    SUM(CASE WHEN expirationDate <= CURDATE() THEN units ELSE 0 END) AS expiredUnits
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID;

-- ============================================
-- 14. ADD BLOOD TO INVENTORY (AUTOMATIC INCREMENT)
-- ============================================
-- This query adds blood to inventory (when donation is approved)
-- Used by: OrganizationDashboard.jsx - handleConfirmApproval()
-- Note: Use stored procedure ApproveDonationAndAddToInventory for automatic handling

-- 14a. Add new blood to inventory (increment)
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
-- 
-- IMPORTANT: Before running this query, make sure:
-- 1. Organization exists: SELECT id, name FROM organizations WHERE id = 1;
-- 2. Donation exists (if using donationId): SELECT id, bloodGroup FROM donations WHERE id = 1;
-- 3. If no organization exists, create one first (see Step 1 below)

-- Step 1: Check if organization exists (run this first)
SELECT id, name FROM organizations LIMIT 1;  -- If this returns no rows, create an organization first

-- Step 2: If no organizations exist, create one first:
-- INSERT INTO organizations (name, email, phone, address, city, state, zipCode, isActive)
-- VALUES ('Test Organization', 'test@example.com', '+1234567890', '123 Main St', 'New York', 'NY', '10001', TRUE);

-- Step 3: Insert into inventory (use subquery to get organization ID, or replace with actual ID)
INSERT INTO blood_inventory (
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status
) 
SELECT 
    (SELECT id FROM organizations LIMIT 1) AS organizationId,  -- Use first available organization ID
    (SELECT id FROM donations LIMIT 1) AS donationId,  -- Use first available donation ID (can be NULL)
    'O+' AS bloodGroup,  -- Replace 'O+' with actual blood group
    'Whole Blood' AS donationType,  -- Replace 'Whole Blood' with actual donation type
    1 AS units,  -- Replace 1 with actual units
    '2025-01-31' AS expirationDate,  -- Replace with actual expiration date
    'active' AS status
WHERE EXISTS (SELECT 1 FROM organizations LIMIT 1);  -- Only insert if organization exists

-- 14b. If same blood group, type, and expiration exists, increment units instead
-- (This handles batch additions of the same type)
-- First check if exists, then update or insert
UPDATE blood_inventory
SET 
    units = units + 1,  -- Replace 1 with actual units
    updatedAt = NOW()
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND donationType = 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
  AND expirationDate = '2025-01-31'  -- Replace with actual expiration date
  AND status = 'active';

-- If no rows were updated, insert new record
-- IMPORTANT: Make sure organization exists before running this
INSERT INTO blood_inventory (
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status
)
SELECT 
    (SELECT id FROM organizations LIMIT 1) AS organizationId,  -- Use first available organization ID
    (SELECT id FROM donations LIMIT 1) AS donationId,  -- Use first available donation ID (can be NULL)
    'O+' AS bloodGroup,  -- Replace 'O+' with actual blood group
    'Whole Blood' AS donationType,  -- Replace 'Whole Blood' with actual donation type
    1 AS units,  -- Replace 1 with actual units
    '2025-01-31' AS expirationDate,  -- Replace with actual expiration date
    'active' AS status
WHERE EXISTS (SELECT 1 FROM organizations LIMIT 1)  -- Only insert if organization exists
  AND NOT EXISTS (
    SELECT 1 FROM blood_inventory
    WHERE organizationId = (SELECT id FROM organizations LIMIT 1)  -- Use same organization ID
      AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
      AND donationType = 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
      AND expirationDate = '2025-01-31'  -- Replace with actual expiration date
      AND status = 'active'
  );

-- 14c. Trigger: Automatically check expiration on insert
-- (Already created in section 16a)

-- ============================================
-- 15. REMOVE BLOOD FROM INVENTORY (AUTOMATIC DECREMENT)
-- ============================================
-- This query removes blood from inventory (when used for request)
-- Used by: OrganizationDashboard.jsx - handleApproveRequest()
-- Note: Use stored procedure ApproveRequestAndDeductFromInventory for automatic handling

-- 15a. Mark inventory as used (FIFO) - decrement units
UPDATE blood_inventory
SET 
    units = units - 2,  -- Replace 2 with actual units required
    status = CASE 
        WHEN units - 2 <= 0 THEN 'used'  -- Replace 2 with actual units required
        ELSE status
    END,
    updatedAt = NOW()
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND donationType = 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
  AND status = 'active'
  AND expirationDate > CURDATE()
  AND units >= 2  -- Replace 2 with actual units required
ORDER BY expirationDate ASC
LIMIT 1;

-- 15b. Delete inventory items with zero units (automatic cleanup)
DELETE FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND units <= 0;

-- 15c. Trigger: Automatically clean up zero-unit inventory items
-- Note: Drop trigger first if it exists, then create new one
-- 
-- IMPORTANT: This trigger requires DELIMITER changes. Run the entire block together:
-- From DELIMITER $$ to DELIMITER ; must be run as one complete statement

DELIMITER $$

DROP TRIGGER IF EXISTS cleanup_zero_units_inventory;
CREATE TRIGGER cleanup_zero_units_inventory
AFTER UPDATE ON blood_inventory
FOR EACH ROW
BEGIN
    IF NEW.units <= 0 THEN
        DELETE FROM blood_inventory WHERE id = NEW.id;
    END IF;
END$$

DELIMITER ;

-- Note: If you get "Commands out of sync" error, make sure to:
-- 1. Run the entire DELIMITER block together (from DELIMITER $$ to DELIMITER ;)
-- 2. Do NOT run DROP TRIGGER and CREATE TRIGGER separately
-- 3. In MySQL Workbench, select the entire block and execute it

-- ============================================
-- 16. AUTOMATIC EXPIRATION UPDATES
-- ============================================
-- These queries and triggers automatically mark expired blood inventory

-- 16a. Trigger: Automatically mark expired inventory on insert/update
-- Note: Drop triggers first if they exist, then create new ones
-- 
-- IMPORTANT: These triggers require DELIMITER changes. Run them as follows:
-- 1. Run the entire block from DELIMITER $$ to DELIMITER ; together
-- 2. Or run each trigger separately with its own DELIMITER block
-- 3. Do NOT run DROP TRIGGER and CREATE TRIGGER separately without DELIMITER

-- Option 1: Run all triggers together (recommended)
DELIMITER $$

DROP TRIGGER IF EXISTS check_blood_expiration_on_insert;
CREATE TRIGGER check_blood_expiration_on_insert
BEFORE INSERT ON blood_inventory
FOR EACH ROW
BEGIN
    IF NEW.expirationDate <= CURDATE() THEN
        SET NEW.status = 'expired';
    END IF;
END$$

DROP TRIGGER IF EXISTS check_blood_expiration_on_update;
CREATE TRIGGER check_blood_expiration_on_update
BEFORE UPDATE ON blood_inventory
FOR EACH ROW
BEGIN
    IF NEW.expirationDate <= CURDATE() AND NEW.status = 'active' THEN
        SET NEW.status = 'expired';
    END IF;
END$$

DELIMITER ;

-- Option 2: Run each trigger separately (if Option 1 doesn't work)
-- Step 1: Create insert trigger
-- DELIMITER $$
-- DROP TRIGGER IF EXISTS check_blood_expiration_on_insert;
-- CREATE TRIGGER check_blood_expiration_on_insert
-- BEFORE INSERT ON blood_inventory
-- FOR EACH ROW
-- BEGIN
--     IF NEW.expirationDate <= CURDATE() THEN
--         SET NEW.status = 'expired';
--     END IF;
-- END$$
-- DELIMITER ;
--
-- Step 2: Create update trigger
-- DELIMITER $$
-- DROP TRIGGER IF EXISTS check_blood_expiration_on_update;
-- CREATE TRIGGER check_blood_expiration_on_update
-- BEFORE UPDATE ON blood_inventory
-- FOR EACH ROW
-- BEGIN
--     IF NEW.expirationDate <= CURDATE() AND NEW.status = 'active' THEN
--         SET NEW.status = 'expired';
--     END IF;
-- END$$
-- DELIMITER ;

-- 16b. Stored Procedure: Mark all expired inventory (can be scheduled)
DELIMITER $$

CREATE PROCEDURE IF NOT EXISTS MarkExpiredInventory()
BEGIN
    UPDATE blood_inventory
    SET 
        status = 'expired',
        updatedAt = NOW()
    WHERE status = 'active'
      AND expirationDate <= CURDATE();
    
    SELECT ROW_COUNT() AS expired_items_updated;
END$$

DELIMITER ;

-- 16c. Event Scheduler: Automatically run expiration check daily
-- Note: Event scheduler must be enabled: SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS daily_expiration_check
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY
DO
  CALL MarkExpiredInventory();

-- 16d. Manual query to mark expired inventory
UPDATE blood_inventory
SET 
    status = 'expired',
    updatedAt = NOW()
WHERE status = 'active'
  AND expirationDate <= CURDATE();

-- Example:
-- CALL MarkExpiredInventory();
-- Or manually:
-- UPDATE blood_inventory SET status = 'expired', updatedAt = NOW() 
-- WHERE status = 'active' AND expirationDate <= CURDATE();

-- ============================================
-- 17. GET ORGANIZATION STATISTICS
-- ============================================
-- These queries provide statistics for dashboard stats cards

-- 17a. Get total approved donations count
SELECT COUNT(*) AS approvedDonationsCount
FROM donations
WHERE selectedOrganization = (SELECT name FROM organizations WHERE id = 1)  -- Replace 1 with actual organization ID
  AND status = 'approved';

-- 17b. Get pending donations count
SELECT COUNT(*) AS pendingDonationsCount
FROM donations
WHERE selectedOrganization = (SELECT name FROM organizations WHERE id = 1)  -- Replace 1 with actual organization ID
  AND status = 'pending';

-- 17c. Get pending requests count
SELECT COUNT(*) AS pendingRequestsCount
FROM requests
WHERE status = 'pending'
  AND city LIKE CONCAT('%', (SELECT city FROM organizations WHERE id = 1), '%');  -- Replace 1 with actual organization ID

-- 17d. Get total events count
SELECT COUNT(*) AS totalEventsCount
FROM events
WHERE organizationId = 1;  -- Replace 1 with actual organization ID

-- 17e. Get upcoming events count
SELECT COUNT(*) AS upcomingEventsCount
FROM events
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND status = 'upcoming'
  AND eventDate >= CURDATE();

-- 17f. Get total event registrations count
SELECT COUNT(*) AS totalRegistrationsCount
FROM donations d
INNER JOIN events e ON d.eventId = e.id
WHERE e.organizationId = 1;  -- Replace 1 with actual organization ID

-- ============================================
-- 18. UPDATE ORGANIZATION PROFILE
-- ============================================
-- This query updates organization profile information
-- Used by: organizationAPI.updateProfile()

-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
UPDATE organizations
SET 
    name = 'Red Cross NYC',  -- Replace with actual organization name
    phone = '+1234567890',  -- Replace with actual phone
    address = '123 Main St',  -- Replace with actual address
    city = 'New York',  -- Replace with actual city
    state = 'NY',  -- Replace with actual state
    zipCode = '10001',  -- Replace with actual zip code
    description = 'Blood donation organization',  -- Replace with actual description
    website = 'https://example.com',  -- Replace with actual website
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual organization ID

-- ============================================
-- 19. GET INVENTORY BY BLOOD GROUP
-- ============================================
-- This query gets inventory filtered by blood group
-- Useful for inventory management

SELECT 
    bloodGroup,
    donationType,
    SUM(units) AS totalUnits,
    MIN(expirationDate) AS earliestExpiration,
    MAX(expirationDate) AS latestExpiration
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND status = 'active'
  AND expirationDate > CURDATE()
GROUP BY bloodGroup, donationType
ORDER BY donationType;

-- ============================================
-- 20. GET INVENTORY EXPIRING SOON
-- ============================================
-- This query gets inventory items expiring within specified days
-- Useful for alerts and notifications

SELECT 
    id,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    DATEDIFF(expirationDate, CURDATE()) AS daysUntilExpiration
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND status = 'active'
  AND expirationDate > CURDATE()
  AND expirationDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)  -- Replace 7 with actual number of days
ORDER BY expirationDate ASC;

-- ============================================
-- 21. GET DONATIONS BY STATUS
-- ============================================
-- This query gets donations filtered by status
-- Used by: OrganizationDashboard.jsx - filtering donations

SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.selectedOrganization = (SELECT name FROM organizations WHERE id = 1)  -- Replace 1 with actual organization ID
  AND d.status = 'pending'  -- Replace 'pending' with: 'pending', 'approved', 'scheduled', 'completed', 'cancelled'
ORDER BY d.createdAt DESC;

-- ============================================
-- 22. GET REQUESTS BY STATUS
-- ============================================
-- This query gets requests filtered by status
-- Used by: OrganizationDashboard.jsx - filtering requests

SELECT 
    r.*
FROM requests r
WHERE r.status = 'pending'  -- Replace 'pending' with: 'pending', 'matched', 'fulfilled', 'cancelled'
  AND r.city LIKE CONCAT('%', (SELECT city FROM organizations WHERE id = 1), '%')  -- Replace 1 with actual organization ID
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 23. CHECK INVENTORY AVAILABILITY
-- ============================================
-- This query checks if organization has enough blood for a request
-- Used before approving a request

SELECT 
    SUM(units) AS availableUnits
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
  AND bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND donationType = 'Whole Blood'  -- Replace 'Whole Blood' with actual donation type
  AND status = 'active'
  AND expirationDate > CURDATE();

-- ============================================
-- 24. GET INVENTORY HISTORY
-- ============================================
-- This query gets inventory history (all statuses)
-- Useful for reporting and auditing

SELECT 
    id,
    organizationId,
    donationId,
    bloodGroup,
    donationType,
    units,
    expirationDate,
    status,
    createdAt,
    updatedAt
FROM blood_inventory
WHERE organizationId = 1  -- Replace 1 with actual organization ID
ORDER BY createdAt DESC;

-- ============================================
-- 25. GET COMPREHENSIVE DASHBOARD STATS
-- ============================================
-- This query provides all dashboard statistics in one query
-- Used by: OrganizationDashboard.jsx - stats display

SELECT 
    o.id AS organizationId,
    o.name AS organizationName,
    (SELECT COUNT(*) FROM donations WHERE selectedOrganization = o.name AND status = 'approved') AS approvedDonations,
    (SELECT COUNT(*) FROM donations WHERE selectedOrganization = o.name AND status = 'pending') AS pendingDonations,
    (SELECT COUNT(*) FROM requests WHERE status = 'pending' AND city LIKE CONCAT('%', o.city, '%')) AS pendingRequests,
    (SELECT COUNT(*) FROM events WHERE organizationId = o.id) AS totalEvents,
    (SELECT COUNT(*) FROM events WHERE organizationId = o.id AND status = 'upcoming' AND eventDate >= CURDATE()) AS upcomingEvents,
    (SELECT COUNT(*) FROM donations d INNER JOIN events e ON d.eventId = e.id WHERE e.organizationId = o.id) AS totalRegistrations,
    (SELECT SUM(units) FROM blood_inventory WHERE organizationId = o.id AND status = 'active' AND expirationDate > CURDATE()) AS totalInventoryUnits
FROM organizations o
WHERE o.id = 1;  -- Replace 1 with actual organization ID

-- ============================================
-- 26. ENABLE EVENT SCHEDULER
-- ============================================
-- Run this to enable the event scheduler for automatic expiration checks
-- Note: Requires SUPER privilege

-- SET GLOBAL event_scheduler = ON;

-- Check if event scheduler is enabled:
-- SHOW VARIABLES LIKE 'event_scheduler';

-- ============================================
-- 27. SUMMARY OF AUTOMATIC FEATURES
-- ============================================
-- 
-- AUTOMATIC INCREMENTS:
-- 1. When donation is approved -> blood_inventory units are automatically incremented
--    Use: CALL ApproveDonationAndAddToInventory(donationId, orgId, type, units, expiration)
--    Or: Direct INSERT into blood_inventory (triggers handle expiration check)
--
-- AUTOMATIC DECREMENTS:
-- 2. When request is fulfilled -> blood_inventory units are automatically decremented (FIFO)
--    Use: CALL ApproveRequestAndDeductFromInventory(requestId, orgId)
--    Or: Direct UPDATE on blood_inventory (triggers handle cleanup)
--
-- AUTOMATIC EXPIRATION:
-- 3. Expired blood is automatically marked as 'expired' status:
--    - Trigger on INSERT: Checks expiration date on insert
--    - Trigger on UPDATE: Checks expiration date on update
--    - Scheduled Event: Daily check for expired items (runs MarkExpiredInventory)
--    - Manual: CALL MarkExpiredInventory() or direct UPDATE query
--
-- AUTOMATIC CLEANUP:
-- 4. Zero-unit inventory items are automatically deleted:
--    - Trigger on UPDATE: Deletes items when units reach 0
--    - Manual: DELETE query for zero units
--
-- ============================================
-- Script completed successfully!
-- ============================================

