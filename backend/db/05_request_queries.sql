-- ============================================
-- Blood Donation Management System
-- Request Queries for Request.jsx Functionality
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
-- 1. CREATE BLOOD REQUEST
-- ============================================
-- This query creates a new blood request record
-- Used by: requestAPI.createRequest()
-- Corresponds to: Request.jsx handleSubmit()

-- For use with prepared statements (application code - Node.js/Sequelize):
-- INSERT INTO requests (
--     userId, userEmail, requestType, patientName, contactPerson, email, phone,
--     bloodGroup, donationType, unitsRequired, urgency, requiredDate,
--     hospitalName, hospitalAddress, city, state, zipCode,
--     patientCondition, doctorName, doctorContact, status
-- ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');

-- For direct MySQL execution (example - replace values with actual data):
-- INSERT INTO requests (
--     userId,
--     userEmail,
--     requestType,
--     patientName,
--     contactPerson,
--     email,
--     phone,
--     bloodGroup,
--     donationType,
--     unitsRequired,
--     urgency,
--     requiredDate,
--     hospitalName,
--     hospitalAddress,
--     city,
--     state,
--     zipCode,
--     patientCondition,
--     doctorName,
--     doctorContact,
--     status
-- ) VALUES (
--     NULL,                       -- userId: NULL if user not logged in, otherwise user ID
--     'patient@example.com',      -- userEmail: User's email
--     'others',                   -- requestType: 'self' or 'others'
--     'John Doe',                 -- patientName
--     'Jane Doe',                 -- contactPerson (NULL if requestType = 'self')
--     'patient@example.com',      -- email
--     '+1234567890',              -- phone
--     'O+',                       -- bloodGroup (A+, A-, B+, B-, AB+, AB-, O+, O-)
--     'Whole Blood',              -- donationType (Whole Blood, Plasma, etc.)
--     2,                          -- unitsRequired (>= 1)
--     'urgent',                   -- urgency ('emergency', 'urgent', 'normal')
--     '2024-12-25',               -- requiredDate (DATE)
--     'City Hospital',            -- hospitalName
--     '123 Hospital St',        -- hospitalAddress
--     'New York',                 -- city
--     'NY',                       -- state
--     '10001',                    -- zipCode
--     'Surgery scheduled',        -- patientCondition (can be NULL)
--     'Dr. Smith',                -- doctorName (can be NULL)
--     '+1987654321',              -- doctorContact (can be NULL)
--     'pending'                   -- status: Default status
-- );

-- Example with actual values:
-- INSERT INTO requests (
--     userId, userEmail, requestType, patientName, contactPerson, email, phone,
--     bloodGroup, donationType, unitsRequired, urgency, requiredDate,
--     hospitalName, hospitalAddress, city, state, zipCode,
--     patientCondition, doctorName, doctorContact, status
-- ) VALUES (
--     NULL, 'patient@example.com', 'others', 'John Doe', 'Jane Doe', 
--     'patient@example.com', '+1234567890', 'O+', 'Whole Blood', 2,
--     'urgent', '2024-12-25', 'City Hospital', '123 Hospital St',
--     'New York', 'NY', '10001', 'Surgery scheduled', 'Dr. Smith', '+1987654321', 'pending'
-- );

-- ============================================
-- 2. FIND POTENTIAL DONORS FOR REQUEST
-- ============================================
-- This query finds potential donors matching blood group and location
-- Used by: request.controller.js createRequest() - after creating request
-- Corresponds to: Automatic donor matching

-- For prepared statements: WHERE u.bloodGroup = ? AND u.city LIKE CONCAT('%', ?, '%')
-- For direct execution: Replace ?bloodGroup and ?city with actual values
SELECT 
    u.id,
    u.fullName,
    u.email,
    u.phone,
    u.bloodGroup,
    u.city,
    u.state,
    u.lastDonationAt,
    DATEDIFF(NOW(), u.lastDonationAt) AS daysSinceLastDonation,
    CASE 
        WHEN u.lastDonationAt IS NULL THEN TRUE
        WHEN DATEDIFF(NOW(), u.lastDonationAt) >= 56 THEN TRUE
        ELSE FALSE
    END AS canDonate
FROM users u
WHERE u.bloodGroup = 'O+'  -- Replace 'O+' with actual blood group
  AND u.city LIKE CONCAT('%', 'New York', '%')  -- Replace 'New York' with actual city
  AND u.isActive = TRUE
  AND (
    u.lastDonationAt IS NULL
    OR u.lastDonationAt <= DATE_SUB(NOW(), INTERVAL 56 DAY)
  )
ORDER BY 
    CASE 
        WHEN u.lastDonationAt IS NULL THEN 0
        ELSE DATEDIFF(NOW(), u.lastDonationAt)
    END DESC
LIMIT 10;

-- Example:
-- SELECT u.id, u.fullName, u.email, u.phone, u.bloodGroup, u.city
-- FROM users u
-- WHERE u.bloodGroup = 'O+'
--   AND u.city LIKE '%New York%'
--   AND u.isActive = TRUE
--   AND (u.lastDonationAt IS NULL OR u.lastDonationAt <= DATE_SUB(NOW(), INTERVAL 56 DAY))
-- LIMIT 10;

-- ============================================
-- 3. GET ALL REQUESTS (with filters)
-- ============================================
-- This query retrieves all requests with optional filters
-- Used by: requestAPI.getAllRequests()
-- Corresponds to: Various dashboard views

-- 3a. Get all requests (no filters)
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
    r.updatedAt,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
ORDER BY r.createdAt DESC;

-- 3b. Get requests filtered by status
-- For prepared statements: WHERE r.status = ?
-- For direct execution: Replace ?status with actual status value
SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.status = 'pending'  -- Replace 'pending' with: 'pending', 'matched', 'fulfilled', 'cancelled'
ORDER BY r.createdAt DESC;

-- 3c. Get requests filtered by urgency
-- For prepared statements: WHERE r.urgency = ?
-- For direct execution: Replace ?urgency with actual urgency value
SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.urgency = 'urgent'  -- Replace 'urgent' with: 'emergency', 'urgent', 'normal'
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.createdAt DESC;

-- 3d. Get requests filtered by blood group
-- For prepared statements: WHERE r.bloodGroup = ?
-- For direct execution: Replace ?bloodGroup with actual blood group
SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.bloodGroup = 'O+'  -- Replace 'O+' with: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
ORDER BY r.createdAt DESC;

-- 3e. Get requests filtered by city
-- For prepared statements: WHERE r.city LIKE CONCAT('%', ?, '%')
-- For direct execution: Replace ?city with actual city name
SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.city LIKE CONCAT('%', 'New York', '%')  -- Replace 'New York' with actual city name
ORDER BY r.createdAt DESC;

-- 3f. Get requests for a specific user (logged in user)
-- For prepared statements: WHERE r.userId = ?
-- For direct execution: Replace ?userId with actual user ID
SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.userId = 1  -- Replace 1 with actual user ID
ORDER BY r.createdAt DESC;

-- 3g. Get requests with multiple filters
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace NULL with actual values or keep NULL to ignore filter
SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE 
    (NULL IS NULL OR r.status = 'pending')  -- Replace NULL with status or keep NULL
    AND (NULL IS NULL OR r.urgency = 'urgent')  -- Replace NULL with urgency or keep NULL
    AND (NULL IS NULL OR r.bloodGroup = 'O+')  -- Replace NULL with blood group or keep NULL
    AND (NULL IS NULL OR r.city LIKE CONCAT('%', 'New York', '%'))  -- Replace NULL with city or keep NULL
    AND (NULL IS NULL OR r.userId = 1)  -- Replace NULL with user ID or keep NULL
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.createdAt DESC;

-- ============================================
-- 4. GET SINGLE REQUEST (with matched donors)
-- ============================================
-- This query retrieves a single request with matched donors
-- Used by: requestAPI.getRequest()
-- Corresponds to: Viewing request details

-- 4a. Get request with user info
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
    r.updatedAt,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.id = 1;  -- Replace 1 with actual request ID

-- 4b. Get matched donors for a request
SELECT 
    u.id,
    u.fullName,
    u.email,
    u.phone,
    u.bloodGroup,
    u.city,
    u.state,
    rd.createdAt AS matchedAt
FROM RequestDonors rd
INNER JOIN users u ON rd.userId = u.id
WHERE rd.requestId = 1  -- Replace 1 with actual request ID
ORDER BY rd.createdAt DESC;

-- 4c. Get request with all matched donors (combined query)
SELECT 
    r.id AS request_id,
    r.userId AS request_userId,
    r.userEmail AS request_userEmail,
    r.requestType,
    r.patientName,
    r.contactPerson,
    r.email AS request_email,
    r.phone AS request_phone,
    r.bloodGroup AS request_bloodGroup,
    r.donationType,
    r.unitsRequired,
    r.urgency,
    r.requiredDate,
    r.hospitalName,
    r.hospitalAddress,
    r.city AS request_city,
    r.state AS request_state,
    r.zipCode AS request_zipCode,
    r.patientCondition,
    r.doctorName,
    r.doctorContact,
    r.status,
    r.createdAt AS request_createdAt,
    r.updatedAt AS request_updatedAt,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    md.id AS matched_donor_id,
    md.fullName AS matched_donor_fullName,
    md.email AS matched_donor_email,
    md.phone AS matched_donor_phone,
    md.bloodGroup AS matched_donor_bloodGroup,
    md.city AS matched_donor_city,
    rd.createdAt AS matchedAt
FROM requests r
LEFT JOIN users u ON r.userId = u.id
LEFT JOIN RequestDonors rd ON r.id = rd.requestId
LEFT JOIN users md ON rd.userId = md.id
WHERE r.id = 1  -- Replace 1 with actual request ID
ORDER BY rd.createdAt DESC;

-- ============================================
-- 5. UPDATE REQUEST STATUS
-- ============================================
-- This query updates the status of a request
-- Used by: requestAPI.updateRequestStatus()
-- Corresponds to: Updating request status (pending -> matched -> fulfilled)

-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
UPDATE requests
SET 
    status = 'matched',  -- Replace 'matched' with: 'pending', 'matched', 'fulfilled', 'cancelled'
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual request ID

-- Example - Mark request as matched:
-- UPDATE requests
-- SET status = 'matched', updatedAt = NOW()
-- WHERE id = 1;

-- Example - Mark request as fulfilled:
-- UPDATE requests
-- SET status = 'fulfilled', updatedAt = NOW()
-- WHERE id = 1;

-- Example - Cancel request:
-- UPDATE requests
-- SET status = 'cancelled', updatedAt = NOW()
-- WHERE id = 1;

-- ============================================
-- 6. MATCH DONORS TO REQUEST
-- ============================================
-- This query matches eligible donors to a blood request
-- Used by: requestAPI.matchDonors()
-- Corresponds to: Finding and linking donors to requests

-- 6a. Find matching donors
-- For prepared statements: Use ?requestId placeholder
-- For direct execution: Replace ?requestId with actual request ID
SELECT 
    u.id,
    u.fullName,
    u.email,
    u.phone,
    u.bloodGroup,
    u.city,
    u.state,
    u.lastDonationAt
FROM users u
WHERE u.bloodGroup = (
    SELECT bloodGroup FROM requests WHERE id = 1  -- Replace 1 with actual request ID
)
AND u.city LIKE CONCAT('%', (
    SELECT city FROM requests WHERE id = 1  -- Replace 1 with actual request ID
), '%')
AND u.isActive = TRUE
AND (
    u.lastDonationAt IS NULL
    OR u.lastDonationAt <= DATE_SUB(NOW(), INTERVAL 56 DAY)
)
ORDER BY 
    CASE 
        WHEN u.lastDonationAt IS NULL THEN 0
        ELSE DATEDIFF(NOW(), u.lastDonationAt)
    END DESC
LIMIT 20;

-- 6b. Insert matched donors into RequestDonors table
-- For prepared statements: Use ?requestId placeholder
-- For direct execution: Replace ?requestId with actual request ID
INSERT INTO RequestDonors (requestId, userId, createdAt, updatedAt)
SELECT 1, u.id, NOW(), NOW()  -- Replace 1 with actual request ID
FROM users u
WHERE u.bloodGroup = (
    SELECT bloodGroup FROM requests WHERE id = 1  -- Replace 1 with actual request ID
)
AND u.city LIKE CONCAT('%', (
    SELECT city FROM requests WHERE id = 1  -- Replace 1 with actual request ID
), '%')
AND u.isActive = TRUE
AND (
    u.lastDonationAt IS NULL
    OR u.lastDonationAt <= DATE_SUB(NOW(), INTERVAL 56 DAY)
)
AND NOT EXISTS (
    SELECT 1 FROM RequestDonors rd 
    WHERE rd.requestId = 1 AND rd.userId = u.id  -- Replace 1 with actual request ID
)
LIMIT 20;

-- 6c. Update request status to 'matched' after matching donors
UPDATE requests
SET 
    status = 'matched',
    updatedAt = NOW()
WHERE id = 1  -- Replace 1 with actual request ID
AND status = 'pending';

-- ============================================
-- 7. DELETE REQUEST
-- ============================================
-- This query deletes a request record
-- Used by: requestAPI.deleteRequest()
-- Corresponds to: User/organization deleting their requests
-- Note: RequestDonors records are automatically deleted due to CASCADE

DELETE FROM requests
WHERE id = 1;  -- Replace 1 with actual request ID

-- Example:
-- DELETE FROM requests WHERE id = 1;

-- ============================================
-- 8. GET URGENT/EMERGENCY REQUESTS
-- ============================================
-- This query gets urgent and emergency requests
-- Useful for priority handling

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    TIMESTAMPDIFF(HOUR, NOW(), r.requiredDate) AS hoursUntilRequired
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.status IN ('pending', 'matched')
  AND r.urgency IN ('emergency', 'urgent')
  AND r.requiredDate >= CURDATE()
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 9. GET REQUESTS BY BLOOD GROUP
-- ============================================
-- This query gets requests filtered by blood group
-- Useful for matching donations to requests

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.bloodGroup = 'O+'  -- Replace 'O+' with: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  AND r.status IN ('pending', 'matched')
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 10. GET REQUESTS BY CITY
-- ============================================
-- This query gets requests filtered by city
-- Useful for location-based filtering

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.city LIKE CONCAT('%', 'New York', '%')  -- Replace 'New York' with actual city name
  AND r.status IN ('pending', 'matched')
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 11. GET REQUEST STATISTICS
-- ============================================
-- These queries provide statistics for dashboards

-- Total requests count
SELECT COUNT(*) AS totalRequests FROM requests;

-- Requests by status
SELECT 
    status,
    COUNT(*) AS count
FROM requests
GROUP BY status;

-- Requests by urgency
SELECT 
    urgency,
    COUNT(*) AS count
FROM requests
WHERE status IN ('pending', 'matched')
GROUP BY urgency
ORDER BY 
    CASE urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END;

-- Requests by blood group
SELECT 
    bloodGroup,
    COUNT(*) AS count
FROM requests
WHERE status IN ('pending', 'matched')
GROUP BY bloodGroup
ORDER BY count DESC;

-- Recent requests (last 30 days)
SELECT COUNT(*) AS recentRequests
FROM requests
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Pending urgent requests
SELECT COUNT(*) AS pendingUrgentRequests
FROM requests
WHERE status = 'pending'
  AND urgency IN ('emergency', 'urgent');

-- ============================================
-- 12. CHECK IF USER HAS PENDING REQUEST
-- ============================================
-- This query checks if user already has a pending request
-- Useful for preventing duplicate submissions

SELECT COUNT(*) AS pendingCount
FROM requests
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'pending';

-- ============================================
-- 13. GET UPCOMING REQUESTS
-- ============================================
-- This query gets requests that are required in the near future
-- Useful for calendar views and reminders

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    DATEDIFF(r.requiredDate, CURDATE()) AS daysUntilRequired
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.status IN ('pending', 'matched')
  AND r.requiredDate >= CURDATE()
  AND r.requiredDate <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY r.requiredDate ASC, 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC;

-- ============================================
-- 14. GET MATCHED DONORS COUNT FOR REQUEST
-- ============================================
-- This query gets the count of matched donors for a request

SELECT COUNT(*) AS matchedDonorsCount
FROM RequestDonors
WHERE requestId = 1;  -- Replace 1 with actual request ID

-- ============================================
-- 15. REMOVE MATCHED DONOR FROM REQUEST
-- ============================================
-- This query removes a matched donor from a request
-- Useful when a donor is no longer available

DELETE FROM RequestDonors
WHERE requestId = 1  -- Replace 1 with actual request ID
  AND userId = 5;  -- Replace 5 with actual user ID

-- Example:
-- DELETE FROM RequestDonors WHERE requestId = 1 AND userId = 5;

-- ============================================
-- 16. GET REQUESTS WITH MATCHED DONORS COUNT
-- ============================================
-- This query gets all requests with count of matched donors

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    COUNT(rd.userId) AS matchedDonorsCount
FROM requests r
LEFT JOIN users u ON r.userId = u.id
LEFT JOIN RequestDonors rd ON r.id = rd.requestId
GROUP BY r.id
ORDER BY r.createdAt DESC;

-- ============================================
-- 17. GET DONORS MATCHED TO MULTIPLE REQUESTS
-- ============================================
-- This query finds donors who are matched to multiple requests
-- Useful for identifying active donors

SELECT 
    u.id,
    u.fullName,
    u.email,
    u.phone,
    u.bloodGroup,
    u.city,
    COUNT(rd.requestId) AS matchedRequestsCount
FROM users u
INNER JOIN RequestDonors rd ON u.id = rd.userId
INNER JOIN requests r ON rd.requestId = r.id
WHERE r.status IN ('pending', 'matched')
GROUP BY u.id
HAVING matchedRequestsCount > 1
ORDER BY matchedRequestsCount DESC;

-- ============================================
-- 18. GET REQUESTS BY DONATION TYPE
-- ============================================
-- This query gets requests filtered by donation type

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.donationType = 'Whole Blood'  -- Replace 'Whole Blood' with: 'Whole Blood', 'Plasma', 'Red Blood Cells', 'Platelets', etc.
  AND r.status IN ('pending', 'matched')
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
        WHEN 'normal' THEN 3
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 19. GET FULFILLED REQUESTS STATISTICS
-- ============================================
-- This query provides statistics on fulfilled requests

SELECT 
    DATE(createdAt) AS requestDate,
    COUNT(*) AS fulfilledCount,
    SUM(unitsRequired) AS totalUnitsFulfilled
FROM requests
WHERE status = 'fulfilled'
  AND createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(createdAt)
ORDER BY requestDate DESC;

-- ============================================
-- 20. GET REQUESTS NEEDING IMMEDIATE ATTENTION
-- ============================================
-- This query gets requests that need immediate attention
-- (Emergency/Urgent requests with required date today or past)

SELECT 
    r.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    DATEDIFF(r.requiredDate, CURDATE()) AS daysOverdue
FROM requests r
LEFT JOIN users u ON r.userId = u.id
WHERE r.status IN ('pending', 'matched')
  AND r.urgency IN ('emergency', 'urgent')
  AND r.requiredDate <= CURDATE()
ORDER BY r.urgency ASC, r.requiredDate ASC;

-- ============================================
-- Script completed successfully!
-- ============================================

