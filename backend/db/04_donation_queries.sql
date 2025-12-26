-- ============================================
-- Blood Donation Management System
-- Donation Queries for Donate.jsx Functionality
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
-- 1. CREATE DONATION
-- ============================================
-- This query creates a new donation record
-- Used by: donationAPI.createDonation()
-- Corresponds to: Donate.jsx handleSubmit()

-- For use with prepared statements (application code - Node.js/Sequelize):
-- INSERT INTO donations (
--     userId, userEmail, fullName, email, phone, age, bloodGroup,
--     address, city, state, zipCode, lastDonationDate, medicalConditions,
--     preferredDate, preferredTime, selectedOrganization,
--     eventId, eventName, eventDate, status
-- ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending');

-- For direct MySQL execution (example - replace values with actual data):
-- INSERT INTO donations (
--     userId,
--     userEmail,
--     fullName,
--     email,
--     phone,
--     age,
--     bloodGroup,
--     address,
--     city,
--     state,
--     zipCode,
--     lastDonationDate,
--     medicalConditions,
--     preferredDate,
--     preferredTime,
--     selectedOrganization,
--     eventId,
--     eventName,
--     eventDate,
--     status
-- ) VALUES (
--     NULL,                       -- userId: NULL if user not logged in, otherwise user ID
--     'user@example.com',         -- userEmail: User's email
--     'John Doe',                 -- fullName
--     'john@example.com',         -- email
--     '+1234567890',              -- phone
--     25,                         -- age (18-65)
--     'O+',                       -- bloodGroup (A+, A-, B+, B-, AB+, AB-, O+, O-)
--     '123 Main St',              -- address
--     'New York',                 -- city
--     'NY',                       -- state
--     '10001',                    -- zipCode
--     '2024-01-15',               -- lastDonationDate (can be NULL)
--     NULL,                       -- medicalConditions (can be NULL)
--     '2024-12-20',               -- preferredDate (NULL if event registration)
--     '10:00',                    -- preferredTime (NULL if event registration)
--     'Red Cross NYC',            -- selectedOrganization (NULL if event registration)
--     NULL,                       -- eventId (NULL if not event registration)
--     NULL,                       -- eventName (NULL if not event registration)
--     NULL,                       -- eventDate (NULL if not event registration)
--     'pending'                   -- status: Default status
-- );

-- Example for event registration:
-- INSERT INTO donations (
--     userId, userEmail, fullName, email, phone, age, bloodGroup,
--     address, city, state, zipCode, lastDonationDate, medicalConditions,
--     preferredDate, preferredTime, selectedOrganization, eventId, eventName, eventDate, status
-- ) VALUES (
--     1, 'john@example.com', 'John Doe', 'john@example.com', '+1234567890', 25, 'O+',
--     '123 Main St', 'New York', 'NY', '10001', '2024-01-15', NULL,
--     NULL, NULL, NULL, 5, 'Community Blood Drive', '2024-12-20', 'pending'
-- );

-- ============================================
-- 2. CHECK 56-DAY COOLDOWN
-- ============================================
-- This query checks if user can donate (must wait 56 days between donations)
-- Used by: donation.controller.js createDonation() - cooldown check
-- Corresponds to: Error handling in Donate.jsx (lines 184-186)

-- For use with prepared statements (application code - Node.js/Sequelize):
-- SELECT 
--     id, fullName, email, lastDonationAt,
--     DATEDIFF(NOW(), lastDonationAt) AS daysSinceLastDonation,
--     CASE 
--         WHEN lastDonationAt IS NULL THEN TRUE
--         WHEN DATEDIFF(NOW(), lastDonationAt) >= 56 THEN TRUE
--         ELSE FALSE
--     END AS canDonate,
--     CASE 
--         WHEN lastDonationAt IS NULL THEN 0
--         WHEN DATEDIFF(NOW(), lastDonationAt) < 56 THEN 56 - DATEDIFF(NOW(), lastDonationAt)
--         ELSE 0
--     END AS daysRemaining
-- FROM users
-- WHERE id = ?;

-- For direct MySQL execution (replace ?userId with actual user ID):
SELECT 
    id,
    fullName,
    email,
    lastDonationAt,
    DATEDIFF(NOW(), lastDonationAt) AS daysSinceLastDonation,
    CASE 
        WHEN lastDonationAt IS NULL THEN TRUE
        WHEN DATEDIFF(NOW(), lastDonationAt) >= 56 THEN TRUE
        ELSE FALSE
    END AS canDonate,
    CASE 
        WHEN lastDonationAt IS NULL THEN 0
        WHEN DATEDIFF(NOW(), lastDonationAt) < 56 THEN 56 - DATEDIFF(NOW(), lastDonationAt)
        ELSE 0
    END AS daysRemaining
FROM users
WHERE id = 1;  -- Replace 1 with actual user ID

-- ============================================
-- 3. GET ALL DONATIONS (with filters)
-- ============================================
-- This query retrieves all donations with optional filters
-- Used by: donationAPI.getAllDonations()
-- Corresponds to: Various dashboard views

-- 3a. Get all donations (no filters)
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
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
ORDER BY d.createdAt DESC;

-- 3b. Get donations filtered by status
-- For prepared statements: WHERE d.status = ?
-- For direct execution: Replace ?status with actual status value
SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
WHERE d.status = 'pending'  -- Replace 'pending' with: 'pending', 'approved', 'scheduled', 'completed', 'cancelled'
ORDER BY d.createdAt DESC;

-- 3c. Get donations filtered by organization
-- For prepared statements: WHERE d.selectedOrganization = ?
-- For direct execution: Replace ?organization with actual organization name
SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
WHERE d.selectedOrganization = 'Red Cross NYC'  -- Replace with actual organization name
ORDER BY d.createdAt DESC;

-- 3d. Get donations filtered by eventId
-- For prepared statements: WHERE d.eventId = ?
-- For direct execution: Replace ?eventId with actual event ID
SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
WHERE d.eventId = 1  -- Replace 1 with actual event ID
ORDER BY d.createdAt DESC;

-- 3e. Get donations for a specific user (logged in user)
-- For prepared statements: WHERE d.userId = ?
-- For direct execution: Replace ?userId with actual user ID
SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
WHERE d.userId = 1  -- Replace 1 with actual user ID
ORDER BY d.createdAt DESC;

-- 3f. Get donations with multiple filters (status + organization + eventId)
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace NULL with actual values or keep NULL to ignore filter
SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
WHERE 
    (NULL IS NULL OR d.status = 'pending')  -- Replace NULL with status or keep NULL
    AND (NULL IS NULL OR d.selectedOrganization = 'Red Cross NYC')  -- Replace NULL with org name or keep NULL
    AND (NULL IS NULL OR d.eventId = 1)  -- Replace NULL with event ID or keep NULL
    AND (NULL IS NULL OR d.userId = 1)  -- Replace NULL with user ID or keep NULL
ORDER BY d.createdAt DESC;

-- ============================================
-- 4. GET SINGLE DONATION
-- ============================================
-- This query retrieves a single donation by ID
-- Used by: donationAPI.getDonation()
-- Corresponds to: Viewing donation details

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
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN users u ON d.userId = u.id
LEFT JOIN events e ON d.eventId = e.id
WHERE d.id = 1;  -- Replace 1 with actual donation ID

-- Example:
-- SELECT d.*, u.id AS user_id, u.fullName AS user_fullName, 
--        e.id AS event_id, e.name AS event_name
-- FROM donations d
-- LEFT JOIN users u ON d.userId = u.id
-- LEFT JOIN events e ON d.eventId = e.id
-- WHERE d.id = 1;

-- ============================================
-- 5. UPDATE DONATION STATUS
-- ============================================
-- This query updates the status and scheduling info of a donation
-- Used by: donationAPI.updateDonationStatus()
-- Corresponds to: Organization dashboard - approving/scheduling donations

-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
UPDATE donations
SET 
    status = COALESCE('approved', status),  -- Replace 'approved' with actual status or NULL
    scheduledDate = COALESCE('2024-12-20', scheduledDate),  -- Replace with actual date or NULL
    scheduledTime = COALESCE('10:00', scheduledTime),  -- Replace with actual time or NULL
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual donation ID

-- Example - Approve and schedule a donation:
-- UPDATE donations
-- SET status = 'scheduled',
--     scheduledDate = '2024-12-20',
--     scheduledTime = '10:00',
--     updatedAt = NOW()
-- WHERE id = 1;

-- Example - Mark donation as completed:
-- UPDATE donations
-- SET status = 'completed',
--     updatedAt = NOW()
-- WHERE id = 1;

-- ============================================
-- 6. UPDATE USER'S LAST DONATION DATE
-- ============================================
-- This query updates the user's lastDonationAt when donation is completed
-- Used by: donation.controller.js updateDonationStatus() - when status = 'completed'
-- Corresponds to: Tracking donation history for cooldown

UPDATE users
SET 
    lastDonationAt = NOW(),
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual user ID

-- Example:
-- UPDATE users
-- SET lastDonationAt = NOW(), updatedAt = NOW()
-- WHERE id = 1;

-- ============================================
-- 7. DELETE DONATION
-- ============================================
-- This query deletes a donation record
-- Used by: donationAPI.deleteDonation()
-- Corresponds to: User/organization deleting their donations

DELETE FROM donations
WHERE id = 1;  -- Replace 1 with actual donation ID

-- Example:
-- DELETE FROM donations WHERE id = 1;

-- ============================================
-- 8. GET DONATIONS FOR ORGANIZATION DASHBOARD
-- ============================================
-- This query gets donations filtered by organization name
-- Used by: organization.controller.js getDashboard()
-- Corresponds to: OrganizationDashboard.jsx

SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.selectedOrganization = 'Red Cross NYC'  -- Replace with actual organization name
ORDER BY d.createdAt DESC
LIMIT 10;

-- Get count of pending donations for organization:
SELECT COUNT(*) AS pendingCount
FROM donations
WHERE selectedOrganization = 'Red Cross NYC'  -- Replace with actual organization name
  AND status = 'pending';

-- ============================================
-- 9. GET DONATIONS BY BLOOD GROUP
-- ============================================
-- This query gets donations filtered by blood group
-- Useful for matching donations to requests

SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.bloodGroup = 'O+'  -- Replace 'O+' with: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
  AND d.status IN ('pending', 'approved', 'scheduled')
ORDER BY d.createdAt DESC;

-- ============================================
-- 10. GET DONATIONS BY CITY
-- ============================================
-- This query gets donations filtered by city
-- Useful for location-based filtering

SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.city = 'New York'  -- Replace 'New York' with actual city name
  AND d.status IN ('pending', 'approved', 'scheduled')
ORDER BY d.createdAt DESC;

-- ============================================
-- 11. GET DONATION STATISTICS
-- ============================================
-- These queries provide statistics for dashboards

-- Total donations count
SELECT COUNT(*) AS totalDonations FROM donations;

-- Donations by status
SELECT 
    status,
    COUNT(*) AS count
FROM donations
GROUP BY status;

-- Donations by blood group
SELECT 
    bloodGroup,
    COUNT(*) AS count
FROM donations
WHERE status = 'completed'
GROUP BY bloodGroup
ORDER BY count DESC;

-- Recent donations (last 30 days)
SELECT COUNT(*) AS recentDonations
FROM donations
WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- Donations for a specific event
SELECT COUNT(*) AS eventDonations
FROM donations
WHERE eventId = 1;  -- Replace 1 with actual event ID

-- ============================================
-- 12. CHECK IF USER HAS PENDING DONATION
-- ============================================
-- This query checks if user already has a pending donation
-- Useful for preventing duplicate submissions

SELECT COUNT(*) AS pendingCount
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'pending';

-- ============================================
-- 13. GET UPCOMING SCHEDULED DONATIONS
-- ============================================
-- This query gets donations that are scheduled for future dates
-- Useful for calendar views and reminders

SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.phone AS user_phone
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.status = 'scheduled'
  AND d.scheduledDate >= CURDATE()
ORDER BY d.scheduledDate ASC, d.scheduledTime ASC;

-- ============================================
-- 14. GET DONATIONS FOR EVENT REGISTRATION
-- ============================================
-- This query gets all donations/registrations for a specific event
-- Used by: eventAPI.getEventRegistrations()

SELECT 
    d.*,
    u.id AS user_id,
    u.fullName AS user_fullName,
    u.email AS user_email,
    u.bloodGroup AS user_bloodGroup
FROM donations d
LEFT JOIN users u ON d.userId = u.id
WHERE d.eventId = 1  -- Replace 1 with actual event ID
ORDER BY d.createdAt DESC;

-- ============================================
-- Script completed successfully!
-- ============================================

