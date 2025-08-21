-- Temporary fix to set a user's type to active
-- Replace the user_id with the actual user ID you want to update

UPDATE users 
SET user_type = 'active' 
WHERE id = '3cd4128c-948c-4fbc-9a73-115a458e4904';

-- Verify the change
SELECT id, email, user_type, is_admin 
FROM users 
WHERE id = '3cd4128c-948c-4fbc-9a73-115a458e4904';
