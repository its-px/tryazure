-- Fix missing roles for existing users
-- This script updates all profiles that don't have a role assigned

-- Set default role to 'user' for all profiles where role is NULL
UPDATE profiles
SET role = 'user'
WHERE role IS NULL;

-- Verify the update
SELECT id, email, full_name, role
FROM profiles
ORDER BY role, email;

-- If you need to manually set specific users as admin or owner, use:
-- UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
-- UPDATE profiles SET role = 'owner' WHERE email = 'owner@example.com';
