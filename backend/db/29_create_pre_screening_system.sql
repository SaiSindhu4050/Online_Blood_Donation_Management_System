-- Migration: Create pre-screening questionnaire system
-- Allows organizations to set health questionnaires and eligibility checks

USE blood_donation_db;

-- Create pre_screening_questions table (reusable questions)
CREATE TABLE IF NOT EXISTS pre_screening_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizationId INT NULL COMMENT 'NULL = system-wide question',
    questionText TEXT NOT NULL,
    questionType ENUM('yes_no', 'multiple_choice', 'text', 'number') DEFAULT 'yes_no',
    options JSON NULL COMMENT 'For multiple_choice questions',
    isRequired BOOLEAN DEFAULT TRUE,
    disqualifyingAnswer VARCHAR(255) NULL COMMENT 'Answer that makes user ineligible',
    orderIndex INT DEFAULT 0,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizationId) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_organizationId (organizationId),
    INDEX idx_isActive (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create event_pre_screening table (links questions to events)
CREATE TABLE IF NOT EXISTS event_pre_screening (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId INT NOT NULL,
    questionId INT NOT NULL,
    isRequired BOOLEAN DEFAULT TRUE,
    orderIndex INT DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES pre_screening_questions(id) ON DELETE CASCADE,
    UNIQUE KEY unique_event_question (eventId, questionId),
    INDEX idx_eventId (eventId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create pre_screening_responses table (user answers)
CREATE TABLE IF NOT EXISTS pre_screening_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    eventId INT NOT NULL,
    donationId INT NULL COMMENT 'Linked to donation registration',
    userId INT NULL,
    userEmail VARCHAR(255) NULL,
    questionId INT NOT NULL,
    answer TEXT NOT NULL,
    isEligible BOOLEAN DEFAULT TRUE COMMENT 'False if answer disqualifies user',
    respondedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (donationId) REFERENCES donations(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES pre_screening_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_eventId (eventId),
    INDEX idx_donationId (donationId),
    INDEX idx_userId (userId),
    INDEX idx_isEligible (isEligible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add pre-screening fields to events table
-- MySQL doesn't support IF NOT EXISTS with ALTER TABLE, so we check first
SET @dbname = DATABASE();
SET @tablename = 'events';

-- Add requiresPreScreening column
SET @colName = 'requiresPreScreening';
SET @colDef = 'BOOLEAN DEFAULT FALSE';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colName) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @colName, ' ', @colDef)
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add preScreeningDeadline column
SET @colName = 'preScreeningDeadline';
SET @colDef = 'DATETIME NULL COMMENT ''Deadline for completing pre-screening''';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colName) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @colName, ' ', @colDef)
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add autoRejectIneligible column
SET @colName = 'autoRejectIneligible';
SET @colDef = 'BOOLEAN DEFAULT TRUE COMMENT ''Auto-reject registrations if ineligible''';
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = @colName) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @colName, ' ', @colDef)
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Insert default system-wide pre-screening questions
INSERT INTO pre_screening_questions (organizationId, questionText, questionType, isRequired, disqualifyingAnswer, orderIndex, isActive) VALUES
(NULL, 'Are you feeling well today?', 'yes_no', TRUE, 'no', 1, TRUE),
(NULL, 'Have you donated blood in the last 56 days?', 'yes_no', TRUE, 'yes', 2, TRUE),
(NULL, 'Do you have any cold or flu symptoms?', 'yes_no', TRUE, 'yes', 3, TRUE),
(NULL, 'Have you had any vaccinations in the last 24 hours?', 'yes_no', TRUE, 'yes', 4, TRUE),
(NULL, 'Are you currently taking any medications?', 'yes_no', FALSE, NULL, 5, TRUE),
(NULL, 'Do you have any chronic medical conditions?', 'yes_no', FALSE, NULL, 6, TRUE);
