-- Set specific users as admin and owner

-- Set a@gmail.com as admin
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'a@gmail.com';

-- Set o@gmail.com as owner
UPDATE profiles 
SET role = 'owner' 
WHERE email = 'o@gmail.com';

-- Verify the changes
SELECT id, email, full_name, role
FROM profiles
WHERE email IN ('a@gmail.com', 'o@gmail.com')
ORDER BY role;
