-- Add is_user flag to profiles
-- When true, the profile was created by a tenant admin (not a self-registered tenant/buyer).
-- Staff users skip onboarding and payment screens.
ALTER TABLE profiles ADD COLUMN is_user BOOLEAN NOT NULL DEFAULT false;

-- Backfill: mark existing profiles that have a parent_auth_user_id different from their own auth_user_id
-- These are staff users created by a tenant owner.
UPDATE profiles
SET is_user = true
WHERE parent_auth_user_id != auth_user_id
  AND is_owner = false;
