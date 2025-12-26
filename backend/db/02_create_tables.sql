-- ============================================
-- Blood Donation Management System
-- Tables Creation Script
-- ============================================

USE blood_donation_db;

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    dateOfBirth DATE NOT NULL,
    age INT NOT NULL CHECK (age >= 18 AND age <= 65),
    gender ENUM('male', 'female', 'other', 'prefer-not-to-say') NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zipCode VARCHAR(20) NOT NULL,
    bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    lastDonationAt DATETIME NULL DEFAULT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_bloodGroup (bloodGroup),
    INDEX idx_city (city),
    INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: organizations
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zipCode VARCHAR(20) NOT NULL,
    description TEXT NULL,
    website VARCHAR(255) NULL,
    isVerified BOOLEAN DEFAULT FALSE,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_city (city),
    INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    eventDate DATETIME NOT NULL,
    eventEndDate DATETIME NULL,
    isMultiDay BOOLEAN DEFAULT FALSE,
    startTime VARCHAR(10) DEFAULT '09:00',
    endTime VARCHAR(10) DEFAULT '17:00',
    location_address VARCHAR(255) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_state VARCHAR(100) NOT NULL,
    location_zip_code VARCHAR(20) NOT NULL,
    targetBloodGroups JSON NULL,
    targetUnits INT DEFAULT 0,
    status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_organizationId (organizationId),
    INDEX idx_eventDate (eventDate),
    INDEX idx_status (status),
    INDEX idx_location_city (location_city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: donations
-- ============================================
CREATE TABLE IF NOT EXISTS donations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    userEmail VARCHAR(255) NULL,
    fullName VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    age INT NOT NULL CHECK (age >= 18 AND age <= 65),
    bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zipCode VARCHAR(20) NOT NULL,
    lastDonationDate DATE NULL,
    medicalConditions TEXT NULL,
    preferredDate DATE NULL,
    preferredTime VARCHAR(10) NULL,
    selectedOrganization VARCHAR(255) NULL,
    eventId INT NULL,
    eventName VARCHAR(255) NULL,
    eventDate DATE NULL,
    status ENUM('pending', 'approved', 'scheduled', 'completed', 'cancelled') DEFAULT 'pending',
    scheduledDate DATE NULL,
    scheduledTime VARCHAR(10) NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_eventId (eventId),
    INDEX idx_status (status),
    INDEX idx_bloodGroup (bloodGroup),
    INDEX idx_city (city),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: requests
-- ============================================
CREATE TABLE IF NOT EXISTS requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL,
    userEmail VARCHAR(255) NULL,
    requestType ENUM('self', 'others') NOT NULL,
    patientName VARCHAR(255) NOT NULL,
    contactPerson VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
    donationType ENUM('Whole Blood', 'Plasma', 'Red Blood Cells', 'Platelets', 'Double Red Cells', 'Cryo', 'White Cells', 'Granulocytes') DEFAULT 'Whole Blood',
    unitsRequired INT NOT NULL CHECK (unitsRequired >= 1),
    urgency ENUM('emergency', 'urgent', 'normal') NOT NULL,
    requiredDate DATE NOT NULL,
    hospitalName VARCHAR(255) NOT NULL,
    hospitalAddress VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zipCode VARCHAR(20) NOT NULL,
    patientCondition TEXT NULL,
    doctorName VARCHAR(255) NULL,
    doctorContact VARCHAR(50) NULL,
    status ENUM('pending', 'matched', 'fulfilled', 'cancelled') DEFAULT 'pending',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_bloodGroup (bloodGroup),
    INDEX idx_urgency (urgency),
    INDEX idx_city (city),
    INDEX idx_requiredDate (requiredDate)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: RequestDonors (Many-to-Many relationship)
-- ============================================
CREATE TABLE IF NOT EXISTS RequestDonors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    requestId INT NOT NULL,
    userId INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_request_user (requestId, userId),
    INDEX idx_requestId (requestId),
    INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: blood_inventory
-- ============================================
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
-- Script completed successfully!
-- ============================================

