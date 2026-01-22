-- Migration: Add hospitalCity field to requests table
-- This separates hospital location from requestor location for donor matching

ALTER TABLE requests
ADD COLUMN hospitalCity VARCHAR(100) NULL AFTER hospitalAddress;

ALTER TABLE requests
ADD COLUMN requestorCity VARCHAR(100) NULL COMMENT 'Requestor/patient city (if different from hospital)' AFTER userId;

-- Update existing records: set hospitalCity = city (assuming city was hospital city)
-- Use WHERE with key column (id) to satisfy safe update mode
UPDATE requests 
SET hospitalCity = COALESCE(hospitalCity, city),
    requestorCity = COALESCE(requestorCity, city)
WHERE id > 0 AND hospitalCity IS NULL;

-- Make hospitalCity NOT NULL after populating
ALTER TABLE requests
MODIFY COLUMN hospitalCity VARCHAR(100) NOT NULL;

-- Add index for hospital city queries
CREATE INDEX idx_hospitalCity ON requests(hospitalCity);
