USE blood_donation_db;

-- Create testimonials table
CREATE TABLE IF NOT EXISTS testimonials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT NULL COMMENT 'User who wrote the testimonial',
    donationId INT NULL COMMENT 'Related donation (if applicable)',
    requestId INT NULL COMMENT 'Related request (if applicable)',
    userType ENUM('donor', 'requestor', 'family_member') NOT NULL COMMENT 'Type of user who wrote the testimonial',
    message TEXT NOT NULL COMMENT 'The testimonial text',
    authorName VARCHAR(255) NOT NULL COMMENT 'Display name for the testimonial',
    authorRole VARCHAR(100) NOT NULL COMMENT 'Role description (e.g., "Family Member", "Regular Donor", "Partner")',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Moderation status',
    isFeatured BOOLEAN DEFAULT FALSE COMMENT 'Whether to highlight on home page',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE SET NULL,
    FOREIGN KEY (requestId) REFERENCES requests(id) ON DELETE SET NULL,
    INDEX idx_userId (userId),
    INDEX idx_status (status),
    INDEX idx_isFeatured (isFeatured),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
