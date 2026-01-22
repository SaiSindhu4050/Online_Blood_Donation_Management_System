-- Migration: Add Donor-First Workflow fields to requests table
-- This implements the 2-hour rule workflow for blood requests

ALTER TABLE requests
ADD COLUMN workflowPhase ENUM('gathering', 'critical_wait', 'assessment', 'hard_stop', 'completed') DEFAULT 'gathering',
ADD COLUMN requestCreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN patientReadyAt DATETIME NULL,
ADD COLUMN waitForDonorsStartedAt DATETIME NULL,
ADD COLUMN waitForDonorsEndsAt DATETIME NULL,
ADD COLUMN assessmentAt DATETIME NULL,
ADD COLUMN hardStopAt DATETIME NULL,
ADD COLUMN inventoryLocked BOOLEAN DEFAULT TRUE,
ADD COLUMN unitsCollected INT DEFAULT 0,
ADD COLUMN emergencyOverride BOOLEAN DEFAULT FALSE,
ADD COLUMN donorETAs JSON NULL COMMENT 'Array of donor ETA objects: {donorId, eta, status}',
ADD COLUMN finalCallSent BOOLEAN DEFAULT FALSE,
ADD COLUMN inventoryUnlockedAt DATETIME NULL;

-- Add index for workflow queries
CREATE INDEX idx_workflowPhase ON requests(workflowPhase);
CREATE INDEX idx_inventoryLocked ON requests(inventoryLocked);
CREATE INDEX idx_patientReadyAt ON requests(patientReadyAt);

-- Update existing requests to have workflowPhase = 'gathering' and inventoryLocked = true
UPDATE requests 
SET workflowPhase = 'gathering', 
    inventoryLocked = TRUE,
    requestCreatedAt = createdAt
WHERE workflowPhase IS NULL;
