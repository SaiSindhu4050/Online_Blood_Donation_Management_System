USE blood_donation_db;

-- Script to create or update an admin account with username
-- Usage: Update the values below and run this script

-- Option 1: Create a new admin account
-- Replace 'Sindhu_7100', 'password123', 'Sindhu', 'sindhu@example.com' with your values
INSERT INTO admins (username, password, fullName, email, role, isActive)
VALUES (
  'Sindhu_7100',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqO', -- This is a placeholder - password will be hashed by the model
  'Sindhu',
  'sindhu@example.com',
  'admin',
  TRUE
)
ON DUPLICATE KEY UPDATE
  fullName = VALUES(fullName),
  email = VALUES(email),
  role = VALUES(role),
  isActive = VALUES(isActive);

-- Note: The password above is a placeholder. 
-- In production, passwords should be hashed using bcrypt.
-- The Admin model will automatically hash passwords on create/update.

-- Option 2: Update existing admin to add username
-- Uncomment and modify the line below if you have an existing admin:
-- UPDATE admins SET username = 'Sindhu_7100' WHERE email = 'your-email@example.com';
