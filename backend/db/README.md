# Database Scripts

This folder contains SQL scripts to set up and manage the MySQL database for the Blood Donation Management System.

## Files Overview

### 1. `01_create_database.sql`
Creates the database `blood_donation_db` with UTF8MB4 character set.

### 2. `02_create_tables.sql`
Creates all required tables. **Run this after creating the database.**

### 3. `03_complete_setup.sql` ⭐ **RECOMMENDED**
Complete setup script that creates both the database and all tables in one go. **Use this for initial setup.**

### 4. `04_donation_queries.sql` 📋 **QUERIES**
Contains all SQL queries needed for donation functionality. These queries correspond to the functions in `Donate.jsx`:
- Create donation
- Check 56-day cooldown
- Get all donations (with filters)
- Get single donation
- Update donation status
- Delete donation
- Get donations for organization dashboard
- Get donation statistics
- And more...

**Note**: These are reference queries. The backend uses Sequelize ORM, but these queries show the underlying SQL operations.

### 5. `05_request_queries.sql` 📋 **QUERIES**
Contains all SQL queries needed for blood request functionality. These queries correspond to the functions in `Request.jsx`:
- Create blood request
- Find potential donors
- Get all requests (with filters: status, urgency, bloodGroup, city)
- Get single request with matched donors
- Update request status
- Match donors to request
- Delete request
- Get urgent/emergency requests
- Get request statistics
- And more...

**Note**: These are reference queries. The backend uses Sequelize ORM, but these queries show the underlying SQL operations.

### 6. `06_user_dashboard_queries.sql` 📋 **QUERIES**
Contains all SQL queries needed for user dashboard functionality. These queries correspond to the functions in `UserDashboard.jsx`:
- Get user profile
- Get user dashboard data (donations, requests, statistics)
- Get donation statistics (counts, history)
- Get request statistics
- Get urgent requests near user
- Get organizations near user
- Get events near user
- Check 56-day cooldown
- Get active/upcoming donations
- Get scheduled appointments
- Update user profile
- Calculate reward points
- And more...

**Note**: These are reference queries. The backend uses Sequelize ORM, but these queries show the underlying SQL operations.

### 7. `07_organization_dashboard_queries.sql` 📋 **QUERIES**
Contains all SQL queries needed for organization dashboard functionality. These queries correspond to the functions in `OrganizationDashboard.jsx`:
- Get organization profile
- Get organization dashboard data (donations, requests, events, statistics)
- Get pending donations for approval
- Approve/deny donations
- Get pending requests
- Approve/deny requests (with inventory check)
- Create, view, delete events
- Get event registrations
- Manage blood inventory (add, remove, view, track expiration)
- Get inventory statistics
- And more...

**Note**: This file also includes the `blood_inventory` table creation. The backend uses Sequelize ORM, but these queries show the underlying SQL operations.

### 8. `08_automatic_inventory_features.sql` ⚙️ **AUTOMATIC FEATURES**
Contains triggers, stored procedures, and events for automatic inventory management:
- **Automatic Expiration**: Triggers and scheduled events to mark expired blood
- **Automatic Increments**: Stored procedure to add blood to inventory when donations are approved
- **Automatic Decrements**: Stored procedure to deduct blood from inventory when requests are fulfilled
- **Automatic Cleanup**: Triggers to remove zero-unit inventory items
- **Batch Operations**: Handles increments/decrements for same blood type and variety

**Features:**
- ✅ Blood automatically expires when expiration date passes
- ✅ Inventory automatically increments when donation is approved
- ✅ Inventory automatically decrements when request is fulfilled (FIFO)
- ✅ Same blood type/variety batches are combined automatically
- ✅ Zero-unit items are automatically cleaned up

**Note**: Run this file after creating tables. Requires event scheduler to be enabled for daily expiration checks.

### 9. `04_drop_database.sql` ⚠️ **DANGER**
Drops the entire database. **Use with extreme caution!** This will delete all data.

## Quick Start

### Option 1: Complete Setup (Recommended)
Run the complete setup script:

```bash
mysql -u root -p < db/03_complete_setup.sql
```

Or using MySQL Workbench/phpMyAdmin:
1. Open the file `03_complete_setup.sql`
2. Execute the entire script

### Option 2: Step by Step
1. Create the database:
   ```bash
   mysql -u root -p < db/01_create_database.sql
   ```

2. Create all tables:
   ```bash
   mysql -u root -p < db/02_create_tables.sql
   ```

## Database Structure

### Tables Created:

1. **users** - User accounts (donors)
   - Stores user information, blood group, donation history
   - Indexed on: email, bloodGroup, city, isActive

2. **organizations** - Organization accounts
   - Stores organization information
   - Indexed on: email, city, isActive

3. **events** - Blood donation events
   - Created by organizations
   - Foreign key to organizations
   - Indexed on: organizationId, eventDate, status, location_city

4. **donations** - Blood donation registrations
   - Can be linked to users and events
   - Foreign keys to: users, events
   - Indexed on: userId, eventId, status, bloodGroup, city, email

5. **requests** - Blood requests from patients/hospitals
   - Can be linked to users
   - Foreign key to: users
   - Indexed on: userId, status, bloodGroup, urgency, city, requiredDate

6. **RequestDonors** - Many-to-many relationship table
   - Links requests to matched donors
   - Foreign keys to: requests, users
   - Unique constraint on (requestId, userId)

7. **blood_inventory** - Blood inventory tracking table
   - Tracks blood units by organization
   - Foreign keys to: organizations, donations
   - Indexed on: organizationId, bloodGroup, donationType, expirationDate, status
   - Tracks expiration dates and status (active, expired, used, discarded)

## Using MySQL Command Line

### Connect to MySQL:
```bash
mysql -u root -p
```

### Run a script:
```bash
source /path/to/backend/db/03_complete_setup.sql
```

Or from outside MySQL:
```bash
mysql -u root -p < /path/to/backend/db/03_complete_setup.sql
```

## Using MySQL Workbench

1. Open MySQL Workbench
2. Connect to your MySQL server
3. File → Open SQL Script
4. Select `03_complete_setup.sql`
5. Click the Execute button (⚡) or press `Ctrl+Shift+Enter`

## Using phpMyAdmin

1. Log in to phpMyAdmin
2. Click on "Import" tab
3. Choose file: `03_complete_setup.sql`
4. Click "Go"

## Verify Installation

After running the setup script, verify the tables were created:

```sql
USE blood_donation_db;
SHOW TABLES;
```

You should see:
- donations
- events
- organizations
- RequestDonors
- requests
- users

## Check Table Structure

To see the structure of a specific table:

```sql
DESCRIBE users;
DESCRIBE organizations;
DESCRIBE donations;
DESCRIBE requests;
DESCRIBE events;
DESCRIBE RequestDonors;
```

## Reset Database

If you need to completely reset the database:

```bash
mysql -u root -p < db/04_drop_database.sql
mysql -u root -p < db/03_complete_setup.sql
```

⚠️ **Warning**: This will delete all existing data!

## Donation Queries

The `04_donation_queries.sql` file contains comprehensive SQL queries for all donation-related operations. These queries are used by:

- **Frontend**: `Donate.jsx` - Donation form submission
- **Backend**: `donation.controller.js` - All donation CRUD operations
- **API Routes**: `/api/donations` - REST endpoints

### Key Queries:

1. **Create Donation** - Inserts a new donation record (supports both logged-in users and anonymous donations)
2. **56-Day Cooldown Check** - Validates if a user can donate based on their last donation date
3. **Get All Donations** - Retrieves donations with optional filters (status, organization, eventId, userId)
4. **Get Single Donation** - Retrieves a specific donation with user and event details
5. **Update Donation Status** - Updates status and scheduling information
6. **Delete Donation** - Removes a donation record
7. **Statistics Queries** - Various aggregation queries for dashboards

### Usage Example:

While the backend uses Sequelize ORM, you can use these queries directly in MySQL:

```sql
-- Check if user can donate
SELECT DATEDIFF(NOW(), lastDonationAt) AS daysSinceLastDonation
FROM users
WHERE id = 1;

-- Get all pending donations
SELECT * FROM donations WHERE status = 'pending';
```

## Request Queries

The `05_request_queries.sql` file contains comprehensive SQL queries for all blood request-related operations. These queries are used by:

- **Frontend**: `Request.jsx` - Blood request form submission
- **Backend**: `request.controller.js` - All request CRUD operations
- **API Routes**: `/api/requests` - REST endpoints

### Key Queries:

1. **Create Request** - Inserts a new blood request record (supports both logged-in users and anonymous requests)
2. **Find Potential Donors** - Automatically finds eligible donors matching blood group and location
3. **Get All Requests** - Retrieves requests with optional filters (status, urgency, bloodGroup, city)
4. **Get Single Request** - Retrieves a specific request with matched donors
5. **Update Request Status** - Updates status (pending → matched → fulfilled)
6. **Match Donors** - Matches eligible donors to a request and links them in RequestDonors table
7. **Delete Request** - Removes a request record
8. **Statistics Queries** - Various aggregation queries for dashboards

### Usage Example:

While the backend uses Sequelize ORM, you can use these queries directly in MySQL:

```sql
-- Get all emergency requests
SELECT * FROM requests 
WHERE urgency = 'emergency' AND status = 'pending'
ORDER BY requiredDate ASC;

-- Find potential donors for a request
SELECT u.* FROM users u
WHERE u.bloodGroup = 'O+'
  AND u.city LIKE '%New York%'
  AND u.isActive = TRUE
  AND (u.lastDonationAt IS NULL OR u.lastDonationAt <= DATE_SUB(NOW(), INTERVAL 56 DAY))
LIMIT 10;
```

## User Dashboard Queries

The `06_user_dashboard_queries.sql` file contains comprehensive SQL queries for all user dashboard-related operations. These queries are used by:

- **Frontend**: `UserDashboard.jsx` - User dashboard display and management
- **Backend**: `user.controller.js` - All user dashboard operations
- **API Routes**: `/api/users/dashboard`, `/api/users/profile` - REST endpoints

### Key Queries:

1. **Get User Profile** - Retrieves complete user profile information
2. **Get Dashboard Data** - Retrieves comprehensive dashboard data (donations, requests, stats)
3. **Donation Statistics** - Calculates donation counts by status
4. **Request Statistics** - Calculates request counts by status
5. **Urgent Requests** - Gets urgent/emergency requests in user's city
6. **Organizations Near User** - Gets organizations filtered by user's city
7. **Events Near User** - Gets upcoming events filtered by user's city
8. **56-Day Cooldown Check** - Validates donation eligibility
9. **Active Donations** - Gets upcoming/active donations
10. **Scheduled Appointments** - Gets appointments from donations and requests
11. **Update Profile** - Updates user profile information
12. **Reward Points** - Calculates reward points from activities
13. **Donation History** - Gets completed donation history

### Usage Example:

While the backend uses Sequelize ORM, you can use these queries directly in MySQL:

```sql
-- Get user dashboard data
SELECT 
    u.*,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'completed') AS donationCount,
    (SELECT COUNT(*) FROM donations WHERE userId = u.id AND status = 'pending') AS pendingDonations
FROM users u
WHERE u.id = 1;

-- Get urgent requests near user
SELECT * FROM requests
WHERE urgency IN ('emergency', 'urgent')
  AND city LIKE '%New York%'
  AND status IN ('pending', 'matched')
ORDER BY urgency ASC, requiredDate ASC;
```

## Organization Dashboard Queries

The `07_organization_dashboard_queries.sql` file contains comprehensive SQL queries for all organization dashboard-related operations. These queries are used by:

- **Frontend**: `OrganizationDashboard.jsx` - Organization dashboard display and management
- **Backend**: `organization.controller.js`, `event.controller.js` - All organization operations
- **API Routes**: `/api/organizations/dashboard`, `/api/organizations/profile`, `/api/events` - REST endpoints

### Key Queries:

1. **Get Organization Profile** - Retrieves complete organization profile information
2. **Get Dashboard Data** - Retrieves comprehensive dashboard data (donations, requests, events, stats)
3. **Pending Donations** - Gets donations pending approval
4. **Approve/Deny Donations** - Updates donation status and adds to inventory
5. **Pending Requests** - Gets blood requests in organization's city
6. **Approve/Deny Requests** - Updates request status with inventory check
7. **Event Management** - Create, view, delete events
8. **Event Registrations** - Gets all registrations for an event
9. **Blood Inventory** - Add, remove, view, track expiration dates
10. **Inventory Statistics** - Get inventory summaries and alerts
11. **Update Profile** - Updates organization profile information

### Blood Inventory Table:

The queries file includes creation of the `blood_inventory` table which tracks:
- Blood units by organization
- Blood group and donation type
- Expiration dates
- Status (active, expired, used, discarded)
- Links to donations

### Usage Example:

While the backend uses Sequelize ORM, you can use these queries directly in MySQL:

```sql
-- Get organization dashboard stats
SELECT 
    o.name,
    (SELECT COUNT(*) FROM donations WHERE selectedOrganization = o.name AND status = 'approved') AS approvedDonations,
    (SELECT COUNT(*) FROM donations WHERE selectedOrganization = o.name AND status = 'pending') AS pendingDonations
FROM organizations o
WHERE o.id = 1;

-- Get blood inventory
SELECT bloodGroup, donationType, SUM(units) AS totalUnits
FROM blood_inventory
WHERE organizationId = 1 AND status = 'active' AND expirationDate > CURDATE()
GROUP BY bloodGroup, donationType;
```

## Notes

- All tables use `InnoDB` engine for foreign key support
- Character set is `utf8mb4` for full Unicode support
- All tables have `createdAt` and `updatedAt` timestamps
- Foreign keys have appropriate `ON DELETE` actions:
  - `CASCADE` for events (when organization is deleted)
  - `SET NULL` for donations/requests (when user is deleted)

## Troubleshooting

### Error: "Database already exists"
- The scripts use `CREATE DATABASE IF NOT EXISTS`, so this is safe to ignore
- Or use `04_drop_database.sql` first to start fresh

### Error: "Table already exists"
- The scripts use `CREATE TABLE IF NOT EXISTS`, so this is safe to ignore
- Tables won't be recreated if they already exist

### Error: "Access denied"
- Make sure you're using a MySQL user with CREATE privileges
- Try: `mysql -u root -p` (root user usually has all privileges)

### Foreign Key Errors
- Make sure tables are created in the correct order
- Use `03_complete_setup.sql` which creates them in the right sequence

