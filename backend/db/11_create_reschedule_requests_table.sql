-- ============================================
-- Create Donation Reschedule Requests Table
-- ============================================

USE blood_donation_db;

-- Table: donation_reschedule_requests
CREATE TABLE IF NOT EXISTS donation_reschedule_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    donationId INT NOT NULL,
    userId INT NOT NULL,
    organizationId INT NULL,
    oldDate DATE NULL,
    oldTime TIME NULL,
    newDate DATE NOT NULL,
    newTime TIME NULL,
    reason TEXT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    rejectionReason TEXT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE SET NULL,
    INDEX idx_donationId (donationId),
    INDEX idx_userId (userId),
    INDEX idx_organizationId (organizationId),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: notifications (if not exists)
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    relatedId INT NULL,
    relatedType VARCHAR(50) NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_read (read),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

