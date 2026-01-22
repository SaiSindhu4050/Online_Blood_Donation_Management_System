-- Migration: Create event waitlist system
-- Allows users to join waitlist when events are full
-- Auto-notifies when spots become available

USE blood_donation_db;

-- Create event_waitlist table
CREATE TABLE IF NOT EXISTS event_waitlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId INT NOT NULL,
    userId INT NULL,
    userEmail VARCHAR(255) NULL,
    fullName VARCHAR(255) NULL,
    phone VARCHAR(50) NULL,
    bloodGroup VARCHAR(10) NOT NULL,
    status ENUM('waiting', 'notified', 'registered', 'cancelled') DEFAULT 'waiting',
    priority INT DEFAULT 0 COMMENT 'Higher priority = earlier in queue (0 = normal, 1+ = higher priority)',
    notifiedAt DATETIME NULL COMMENT 'When user was notified of available spot',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_eventId (eventId),
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
