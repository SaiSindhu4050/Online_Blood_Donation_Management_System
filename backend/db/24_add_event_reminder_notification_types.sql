-- Migration: Add event reminder notification types
-- This adds EVENT_REMINDER_24H and EVENT_REMINDER_2H to the notifications type ENUM

USE blood_donation_db;

-- Update notifications type ENUM to include event reminder types
ALTER TABLE notifications
MODIFY COLUMN type ENUM(
  'BLOOD_REQUEST',
  'SHARE_REQUEST',
  'REQUEST_ACCEPTED',
  'CAMPAIGN',
  'DONATION_COMPLETED',
  'EVENT_REMINDER_24H',
  'EVENT_REMINDER_2H'
) NOT NULL;
