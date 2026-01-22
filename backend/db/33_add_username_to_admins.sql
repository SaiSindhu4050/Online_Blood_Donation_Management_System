USE blood_donation_db;

-- Add username column to admins table (if it doesn't exist)
-- Check if column exists first to avoid errors on re-run
SET @dbname = DATABASE();
SET @tablename = "admins";
SET @columnname = "username";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  "SELECT 'Column already exists.'",
  CONCAT("ALTER TABLE ", @tablename, " ADD COLUMN ", @columnname, " VARCHAR(100) UNIQUE NULL AFTER id")
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Create index on username for faster lookups (if it doesn't exist)
SET @indexname = "idx_username";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      (table_schema = @dbname)
      AND (table_name = @tablename)
      AND (index_name = @indexname)
  ) > 0,
  "SELECT 'Index already exists.'",
  CONCAT("CREATE INDEX ", @indexname, " ON ", @tablename, "(", @columnname, ")")
));
PREPARE createIndexIfNotExists FROM @preparedStatement;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- For existing admins without username, generate one from email or set a default
-- This will set username based on email prefix (before @) if email exists
UPDATE admins 
SET username = SUBSTRING_INDEX(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- For any remaining admins without username, set a default based on ID
UPDATE admins 
SET username = CONCAT('admin_', id)
WHERE username IS NULL;
