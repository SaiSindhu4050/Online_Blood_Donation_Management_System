-- ============================================
-- Blood Donation Management System
-- User Dashboard Queries for UserDashboard.jsx Functionality
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
-- 1. GET USER PROFILE
-- ============================================
-- This query retrieves a user's profile information
-- Used by: authAPI.getMe() and userAPI.getProfile()
-- Corresponds to: UserDashboard.jsx - loading user data

-- For prepared statements: WHERE id = ?
-- For direct execution: Replace ?userId with actual user ID
SELECT 
    id,
    fullName,
    email,
    phone,
    dateOfBirth,
    age,
    gender,
    address,
    city,
    state,
    zipCode,
    bloodGroup,
    lastDonationAt,
    role,
    isActive,
    createdAt,
    updatedAt
FROM users
WHERE id = 1;  -- Replace 1 with actual user ID

-- Example:
-- SELECT * FROM users WHERE id = 1;

-- ============================================
-- 2. GET USER DASHBOARD DATA
-- ============================================
-- This query retrieves comprehensive dashboard data for a user
-- Used by: userAPI.getDashboard()
-- Corresponds to: UserDashboard.jsx - initial data loading

-- 2a. Get user with donation and request counts
SELECT 
    u.id,
    u.fullName,
    u.email,
    u.phone,
    u.dateOfBirth,
    u.age,
    u.gender,
    u.address,
    u.city,
    u.state,
    u.zipCode,
    u.bloodGroup,
    u.lastDonationAt,
    u.role,
    u.isActive,
    u.createdAt,
    u.updatedAt,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'completed') AS donationCount,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'pending') AS pendingDonationsCount,
    (SELECT COUNT(*) FROM requests WHERE userId = u.id) AS totalRequestsCount,
    (SELECT COUNT(*) FROM requests WHERE userId = u.id AND status = 'pending') AS pendingRequestsCount
FROM users u
WHERE u.id = 1;  -- Replace 1 with actual user ID

-- 2b. Get recent donations for user (last 10)
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
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate,
    e.location_city AS event_location_city
FROM donations d
LEFT JOIN events e ON d.eventId = e.id
WHERE d.userId = 1  -- Replace 1 with actual user ID
ORDER BY d.createdAt DESC
LIMIT 10;

-- 2c. Get recent requests for user (last 10)
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
WHERE r.userId = 1  -- Replace 1 with actual user ID
ORDER BY r.createdAt DESC
LIMIT 10;

-- ============================================
-- 3. GET USER DONATION STATISTICS
-- ============================================
-- These queries provide statistics for the dashboard stats cards
-- Used by: UserDashboard.jsx - stats display

-- 3a. Get total completed donations count
SELECT COUNT(*) AS donationCount
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'completed';

-- 3b. Get total donations count (all statuses)
SELECT COUNT(*) AS totalDonations
FROM donations
WHERE userId = 1;  -- Replace 1 with actual user ID

-- 3c. Get pending donations count
SELECT COUNT(*) AS pendingDonations
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'pending';

-- 3d. Get approved donations count
SELECT COUNT(*) AS approvedDonations
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'approved';

-- 3e. Get scheduled donations count
SELECT COUNT(*) AS scheduledDonations
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'scheduled';

-- 3f. Get donation count by status
SELECT 
    status,
    COUNT(*) AS count
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
GROUP BY status;

-- ============================================
-- 4. GET USER REQUEST STATISTICS
-- ============================================
-- These queries provide request statistics for the dashboard

-- 4a. Get total requests count
SELECT COUNT(*) AS totalRequests
FROM requests
WHERE userId = 1;  -- Replace 1 with actual user ID

-- 4b. Get requests by status
SELECT 
    status,
    COUNT(*) AS count
FROM requests
WHERE userId = 1  -- Replace 1 with actual user ID
GROUP BY status;

-- 4c. Get pending requests count
SELECT COUNT(*) AS pendingRequests
FROM requests
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'pending';

-- 4d. Get matched requests count
SELECT COUNT(*) AS matchedRequests
FROM requests
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'matched';

-- 4e. Get fulfilled requests count
SELECT COUNT(*) AS fulfilledRequests
FROM requests
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'fulfilled';

-- ============================================
-- 5. GET URGENT REQUESTS NEAR USER
-- ============================================
-- This query gets urgent/emergency requests in user's city
-- Used by: UserDashboard.jsx - urgent requests section
-- Corresponds to: requestAPI.getAllRequests({ urgency: 'urgent' })

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
WHERE r.urgency IN ('emergency', 'urgent')
  AND r.status IN ('pending', 'matched')
  AND r.city LIKE CONCAT('%', (SELECT city FROM users WHERE id = 1), '%')  -- Replace 1 with actual user ID
ORDER BY 
    CASE r.urgency
        WHEN 'emergency' THEN 1
        WHEN 'urgent' THEN 2
    END ASC,
    r.requiredDate ASC;

-- ============================================
-- 6. GET ORGANIZATIONS NEAR USER
-- ============================================
-- This query gets organizations in user's city
-- Used by: UserDashboard.jsx - organizations tab
-- Corresponds to: organizationAPI.getAllOrganizations(userData.city)

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
WHERE city LIKE CONCAT('%', 'New York', '%')  -- Replace 'New York' with actual city name
  AND isActive = TRUE
ORDER BY name ASC;

-- ============================================
-- 7. GET EVENTS NEAR USER
-- ============================================
-- This query gets upcoming events in user's city
-- Used by: UserDashboard.jsx - events tab
-- Corresponds to: eventAPI.getAllEvents({ city: userData.city })

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
    o.name AS orgName
FROM events e
INNER JOIN organizations o ON e.organizationId = o.id
WHERE e.location_city LIKE CONCAT('%', 'New York', '%')  -- Replace 'New York' with actual city name
  AND e.status = 'upcoming'
  AND e.eventDate >= CURDATE()
ORDER BY e.eventDate ASC;

-- ============================================
-- 8. CHECK 56-DAY COOLDOWN
-- ============================================
-- This query checks if user can donate (must wait 56 days)
-- Used by: UserDashboard.jsx - handleDonateClick()
-- Corresponds to: Donation eligibility check

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
-- 9. GET ACTIVE DONATION (UPCOMING)
-- ============================================
-- This query gets the user's active/upcoming donation
-- Used by: UserDashboard.jsx - getActiveDonation()
-- Corresponds to: Displaying days until donation

SELECT 
    d.id,
    d.userId,
    d.eventId,
    d.eventName,
    d.eventDate,
    d.status,
    d.scheduledDate,
    d.scheduledTime,
    DATEDIFF(d.eventDate, CURDATE()) AS daysUntilDonation
FROM donations d
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND (
    d.status = 'pending'
    OR (d.status = 'approved' AND d.eventDate > NOW())
  )
ORDER BY d.eventDate ASC
LIMIT 1;

-- ============================================
-- 10. GET DONATION HISTORY
-- ============================================
-- This query gets user's completed donation history
-- Used by: UserDashboard.jsx - donations history modal
-- Corresponds to: showDonationsHistoryModal

SELECT 
    d.id,
    d.userId,
    d.eventId,
    d.eventName,
    d.eventDate,
    d.scheduledDate,
    d.scheduledTime,
    d.bloodGroup,
    d.city,
    d.state,
    d.selectedOrganization,
    d.status,
    d.createdAt,
    d.updatedAt,
    e.name AS event_name,
    e.location_city AS event_location
FROM donations d
LEFT JOIN events e ON d.eventId = e.id
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND d.status = 'completed'
ORDER BY 
    COALESCE(d.eventDate, d.scheduledDate, d.updatedAt) DESC;

-- ============================================
-- 11. GET SCHEDULED APPOINTMENTS
-- ============================================
-- This query gets user's scheduled appointments from donations and requests
-- Used by: UserDashboard.jsx - handleAppointmentClick()
-- Corresponds to: Appointment management modal

-- 11a. Get scheduled donations (appointments)
SELECT 
    d.id,
    'donation' AS type,
    d.eventName AS eventName,
    COALESCE(d.eventDate, d.scheduledDate, d.preferredDate) AS appointmentDate,
    COALESCE(d.scheduledTime, d.preferredTime) AS appointmentTime,
    d.status,
    d.city AS location,
    d.selectedOrganization AS hospitalName,
    d.eventId,
    d.eventName AS eventName
FROM donations d
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND d.status IN ('pending', 'approved', 'scheduled')
  AND (
    d.eventDate >= CURDATE()
    OR d.scheduledDate >= CURDATE()
    OR d.preferredDate >= CURDATE()
  )
ORDER BY COALESCE(d.eventDate, d.scheduledDate, d.preferredDate) ASC;

-- 11b. Get scheduled requests (appointments)
SELECT 
    r.id,
    'request' AS type,
    CONCAT('Blood Request - ', r.bloodGroup) AS eventName,
    r.requiredDate AS appointmentDate,
    NULL AS appointmentTime,
    r.status,
    CONCAT(r.city, ', ', r.state) AS location,
    r.hospitalName,
    NULL AS eventId,
    NULL AS eventName
FROM requests r
WHERE r.userId = 1  -- Replace 1 with actual user ID
  AND r.status IN ('pending', 'matched')
  AND r.requiredDate >= CURDATE()
ORDER BY r.requiredDate ASC;

-- ============================================
-- 12. UPDATE USER PROFILE
-- ============================================
-- This query updates user profile information
-- Used by: userAPI.updateProfile()
-- Corresponds to: UserDashboard.jsx - handleSaveProfile()

-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
UPDATE users
SET 
    fullName = 'John Doe',  -- Replace with actual full name
    phone = '+1234567890',  -- Replace with actual phone
    dateOfBirth = '1990-01-15',  -- Replace with actual date of birth
    age = 34,  -- Replace with actual age
    gender = 'Male',  -- Replace with: 'Male', 'Female', 'Other'
    address = '123 Main St',  -- Replace with actual address
    city = 'New York',  -- Replace with actual city
    state = 'NY',  -- Replace with actual state
    zipCode = '10001',  -- Replace with actual zip code
    bloodGroup = 'O+',  -- Replace with: 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
    updatedAt = NOW()
WHERE id = 1;  -- Replace 1 with actual user ID

-- Example with password update:
-- UPDATE users
-- SET 
--     fullName = 'John Doe',
--     phone = '+1234567890',
--     address = '123 Main St',
--     city = 'New York',
--     state = 'NY',
--     zipCode = '10001',
--     bloodGroup = 'O+',
--     password = ?hashedPassword,  -- Only if password is being changed
--     updatedAt = NOW()
-- WHERE id = 1;

-- ============================================
-- 13. UPDATE USER EMAIL
-- ============================================
-- This query updates user email (separate to check for duplicates)
-- Used by: userAPI.updateProfile() - when email changes

-- First check if email already exists
SELECT COUNT(*) AS emailExists
FROM users
WHERE email = 'user@example.com'  -- Replace with actual email
  AND id != 1;  -- Replace 1 with actual user ID

-- Then update if email doesn't exist
-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
-- Note: MySQL doesn't allow updating a table while checking the same table in subquery
-- Solution: Use a derived table or check first, then update

-- Option 1: Check first, then update (recommended for direct execution)
-- First, check if email exists:
-- SELECT COUNT(*) AS emailExists
-- FROM users
-- WHERE email = 'newemail@example.com' AND id != 1;
-- If emailExists = 0, then run the UPDATE below

-- Option 2: Update using derived table (works in MySQL)
UPDATE users u1
SET 
    u1.email = 'newemail@example.com',  -- Replace with actual new email
    u1.updatedAt = NOW()
WHERE u1.id = 1  -- Replace 1 with actual user ID
  AND NOT EXISTS (
    SELECT 1 FROM (SELECT * FROM users) AS u2
    WHERE u2.email = 'newemail@example.com' AND u2.id != 1  -- Replace with actual new email and user ID
  );

-- ============================================
-- 14. GET USER'S DONATIONS WITH FILTERS
-- ============================================
-- This query gets user's donations with various filters
-- Used by: donationAPI.getAllDonations({ userId: user.id })

SELECT 
    d.*,
    e.id AS event_id,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN events e ON d.eventId = e.id
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND (NULL IS NULL OR d.status = 'pending')  -- Replace NULL with status or keep NULL, replace 'pending' with actual status
ORDER BY d.createdAt DESC;

-- ============================================
-- 15. GET USER'S REQUESTS WITH FILTERS
-- ============================================
-- This query gets user's requests with various filters
-- Used by: requestAPI.getAllRequests({ userId: user.id })

SELECT 
    r.*
FROM requests r
WHERE r.userId = 1  -- Replace 1 with actual user ID
  AND (NULL IS NULL OR r.status = 'pending')  -- Replace NULL with status or keep NULL, replace 'pending' with actual status
ORDER BY r.createdAt DESC;

-- ============================================
-- 16. CALCULATE REWARD POINTS
-- ============================================
-- This query calculates user's reward points
-- Note: Reward points can be calculated from completed donations
-- Used by: UserDashboard.jsx - reward points display

-- 16a. Calculate reward points from completed donations
-- (Assuming 100 points per completed donation)
SELECT 
    COUNT(*) * 100 AS rewardPoints
FROM donations
WHERE userId = 1  -- Replace 1 with actual user ID
  AND status = 'completed';

-- 16b. Get reward points with breakdown
-- For prepared statements: Use ?userId placeholder
-- For direct execution: Replace 1 with actual user ID in all subqueries
-- Note: If reviews table doesn't exist, use the version below without reviews

-- Version WITH reviews table (uncomment if reviews table exists):
-- SELECT 
--     (SELECT COUNT(*) * 100 FROM donations WHERE userId = 1 AND status = 'completed') AS donationPoints,  -- Replace 1 with actual user ID
--     (SELECT COUNT(*) * 50 FROM requests WHERE userId = 1 AND status = 'fulfilled') AS requestPoints,  -- Replace 1 with actual user ID
--     (SELECT COUNT(*) * 50 FROM reviews WHERE userId = 1) AS reviewPoints,  -- Replace 1 with actual user ID
--     (
--         (SELECT COUNT(*) * 100 FROM donations WHERE userId = 1 AND status = 'completed') +  -- Replace 1 with actual user ID
--         (SELECT COUNT(*) * 50 FROM requests WHERE userId = 1 AND status = 'fulfilled') +  -- Replace 1 with actual user ID
--         (SELECT COUNT(*) * 50 FROM reviews WHERE userId = 1)  -- Replace 1 with actual user ID
--     ) AS totalRewardPoints;

-- Version WITHOUT reviews table (use this if reviews table doesn't exist):
SELECT 
    (SELECT COUNT(*) * 100 FROM donations WHERE userId = 1 AND status = 'completed') AS donationPoints,  -- Replace 1 with actual user ID
    (SELECT COUNT(*) * 50 FROM requests WHERE userId = 1 AND status = 'fulfilled') AS requestPoints,  -- Replace 1 with actual user ID
    0 AS reviewPoints,  -- Set to 0 if reviews table doesn't exist
    (
        (SELECT COUNT(*) * 100 FROM donations WHERE userId = 1 AND status = 'completed') +  -- Replace 1 with actual user ID
        (SELECT COUNT(*) * 50 FROM requests WHERE userId = 1 AND status = 'fulfilled')  -- Replace 1 with actual user ID
    ) AS totalRewardPoints;

-- ============================================
-- 17. GET DAYS SINCE LAST DONATION
-- ============================================
-- This query calculates days since last donation
-- Used by: UserDashboard.jsx - last donation display

SELECT 
    id,
    fullName,
    lastDonationAt,
    DATEDIFF(NOW(), lastDonationAt) AS daysSinceLastDonation,
    CASE 
        WHEN lastDonationAt IS NULL THEN 'Never'
        ELSE CONCAT(DATEDIFF(NOW(), lastDonationAt), ' days ago')
    END AS lastDonationText
FROM users
WHERE id = 1;  -- Replace 1 with actual user ID

-- ============================================
-- 18. GET UPCOMING DONATION DATE
-- ============================================
-- This query gets the next scheduled donation date
-- Used by: UserDashboard.jsx - upcoming donation display

SELECT 
    d.id,
    d.eventDate,
    d.scheduledDate,
    d.preferredDate,
    COALESCE(d.eventDate, d.scheduledDate, d.preferredDate) AS nextDonationDate,
    DATEDIFF(COALESCE(d.eventDate, d.scheduledDate, d.preferredDate), CURDATE()) AS daysUntilDonation
FROM donations d
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND d.status IN ('pending', 'approved', 'scheduled')
  AND COALESCE(d.eventDate, d.scheduledDate, d.preferredDate) >= CURDATE()
ORDER BY COALESCE(d.eventDate, d.scheduledDate, d.preferredDate) ASC
LIMIT 1;

-- ============================================
-- 19. DELETE USER DONATION
-- ============================================
-- This query deletes a user's donation
-- Used by: UserDashboard.jsx - delete donation action
-- Corresponds to: donationAPI.deleteDonation()

DELETE FROM donations
WHERE id = 1  -- Replace 1 with actual donation ID
  AND userId = 1;  -- Replace 1 with actual user ID

-- ============================================
-- 20. DELETE USER REQUEST
-- ============================================
-- This query deletes a user's request
-- Used by: UserDashboard.jsx - delete request action
-- Corresponds to: requestAPI.deleteRequest()

DELETE FROM requests
WHERE id = 1  -- Replace 1 with actual request ID
  AND userId = 1;  -- Replace 1 with actual user ID

-- ============================================
-- 21. UPDATE DONATION STATUS (RESCHEDULE)
-- ============================================
-- This query updates donation date/time for rescheduling
-- Used by: UserDashboard.jsx - handleSubmitReschedule()
-- Corresponds to: donationAPI.updateDonationStatus()

-- For prepared statements: Use ? placeholders
-- For direct execution: Replace placeholders with actual values
UPDATE donations
SET 
    status = 'scheduled',  -- Replace with: 'pending', 'approved', 'scheduled', 'completed', 'cancelled'
    preferredDate = '2024-12-20',  -- Replace with actual date or NULL
    preferredTime = '10:00',  -- Replace with actual time or NULL
    scheduledDate = '2024-12-20',  -- Replace with actual date or NULL
    scheduledTime = '10:00',  -- Replace with actual time or NULL
    updatedAt = NOW()
WHERE id = 1  -- Replace 1 with actual donation ID
  AND userId = 1;  -- Replace 1 with actual user ID

-- ============================================
-- 22. GET DONATIONS BY STATUS
-- ============================================
-- This query gets user's donations filtered by status
-- Used by: UserDashboard.jsx - filtering donations

SELECT 
    d.*,
    e.name AS event_name,
    e.eventDate AS event_eventDate
FROM donations d
LEFT JOIN events e ON d.eventId = e.id
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND d.status = 'pending'  -- Replace 'pending' with: 'pending', 'approved', 'scheduled', 'completed', 'cancelled'
ORDER BY d.createdAt DESC;

-- ============================================
-- 23. GET REQUESTS BY STATUS
-- ============================================
-- This query gets user's requests filtered by status
-- Used by: UserDashboard.jsx - filtering requests

SELECT 
    r.*
FROM requests r
WHERE r.userId = 1  -- Replace 1 with actual user ID
  AND r.status = 'pending'  -- Replace 'pending' with: 'pending', 'matched', 'fulfilled', 'cancelled'
ORDER BY r.createdAt DESC;

-- ============================================
-- 24. GET USER ACTIVITY SUMMARY
-- ============================================
-- This query provides a comprehensive activity summary
-- Used by: UserDashboard.jsx - activity overview

SELECT 
    u.id AS userId,
    u.fullName,
    u.email,
    u.city,
    u.bloodGroup,
    u.lastDonationAt,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'completed') AS totalDonations,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'pending') AS pendingDonations,
    (SELECT COUNT(*) FROM requests WHERE userId = u.id) AS totalRequests,
    (SELECT COUNT(*) FROM requests WHERE userId = u.id AND status = 'pending') AS pendingRequests,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'completed') * 100 AS rewardPoints,
    (SELECT MIN(eventDate) FROM donations WHERE userId = u.id AND status IN ('pending', 'approved', 'scheduled') AND eventDate >= CURDATE()) AS nextDonationDate
FROM users u
WHERE u.id = 1;  -- Replace 1 with actual user ID

-- ============================================
-- 25. GET DONATIONS FOR HISTORY MODAL
-- ============================================
-- This query gets completed donations for history display
-- Used by: UserDashboard.jsx - donations history modal

SELECT 
    d.id,
    d.eventId,
    d.eventName,
    d.eventDate,
    d.scheduledDate,
    d.scheduledTime,
    d.bloodGroup,
    d.city,
    d.state,
    d.selectedOrganization,
    d.status,
    d.createdAt,
    d.updatedAt,
    e.name AS event_name,
    e.location_city AS event_location,
    COALESCE(d.eventDate, d.scheduledDate, d.updatedAt) AS donationDate
FROM donations d
LEFT JOIN events e ON d.eventId = e.id
WHERE d.userId = 1  -- Replace 1 with actual user ID
  AND d.status = 'completed'
ORDER BY COALESCE(d.eventDate, d.scheduledDate, d.updatedAt) DESC;

-- ============================================
-- Script completed successfully!
-- ============================================

