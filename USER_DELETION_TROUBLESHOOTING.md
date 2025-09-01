# User Deletion Troubleshooting Guide

## Problem Description
When trying to delete a user from the admin panel, you encounter the error:
```
Failed to delete selected users: Database error deleting user
```

## Root Causes

### 1. Missing RLS (Row Level Security) Policies
The most common cause is that the database doesn't have proper RLS policies that allow admins to delete users.

### 2. Foreign Key Constraints
Users have related records in multiple tables (picks, purchases, weekly_results, etc.) that need to be handled during deletion.

### 3. Service Role Key Issues
The API might not have proper service role permissions to perform admin operations.

### 4. Auth User vs Profile User Mismatch
There might be a mismatch between the auth.users table and the public.users table.

## Solutions

### Solution 1: Fix RLS Policies (Recommended)

Run the `fix-user-deletion-rls.sql` script in your Supabase SQL Editor:

```sql
-- This script adds proper DELETE policies for admins
-- Run this in Supabase SQL Editor
```

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `fix-user-deletion-rls.sql`
4. Run the script
5. Verify the policies were created successfully

### Solution 2: Check Service Role Key

Ensure your environment variables are properly configured:

```bash
# In your .env.local file
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**To get your service role key:**
1. Go to Supabase Dashboard
2. Navigate to Settings > API
3. Copy the "service_role" key (not the anon key)

### Solution 3: Manual Database Cleanup

If the automated deletion still fails, you can manually clean up the user:

```sql
-- Run this in Supabase SQL Editor (replace USER_ID with actual user ID)
BEGIN;

-- Delete related records first
DELETE FROM picks WHERE user_id = 'USER_ID';
DELETE FROM purchases WHERE user_id = 'USER_ID';
DELETE FROM weekly_results WHERE user_id = 'USER_ID';
DELETE FROM invitations WHERE created_by = 'USER_ID' OR used_by = 'USER_ID';

-- Delete the user profile
DELETE FROM users WHERE id = 'USER_ID';

-- Delete from auth.users (if needed)
-- Note: This requires service role permissions
-- DELETE FROM auth.users WHERE id = 'USER_ID';

COMMIT;
```

### Solution 4: Disable RLS Temporarily (For Testing)

If you need to test deletion without RLS:

```sql
-- Temporarily disable RLS (remember to re-enable after testing)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE purchases DISABLE ROW LEVEL SECURITY;
ALTER TABLE picks DISABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;

-- Re-enable after testing
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
```

## Verification Steps

### 1. Check RLS Policies
```sql
-- Verify DELETE policies exist
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE cmd = 'DELETE'
ORDER BY tablename;
```

### 2. Check Foreign Key Constraints
```sql
-- Check foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'users';
```

### 3. Test Admin Permissions
```sql
-- Check if your user is properly marked as admin
SELECT id, email, is_admin 
FROM users 
WHERE email = 'your-email@example.com';
```

## Common Error Messages and Solutions

### "new row violates row-level security policy"
**Cause:** Missing RLS policy for DELETE operations
**Solution:** Run the RLS fix script

### "foreign key constraint violation"
**Cause:** Related records still exist
**Solution:** Ensure cascade delete is working or manually delete related records

### "permission denied"
**Cause:** Service role key not configured or invalid
**Solution:** Check environment variables and service role key

### "user not found"
**Cause:** User ID doesn't exist in the database
**Solution:** Verify the user exists before attempting deletion

## Prevention

### 1. Regular Policy Audits
Periodically check that all necessary RLS policies exist:

```sql
-- Audit script for RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'DELETE' THEN '⚠️ CHECK DELETE POLICY'
    ELSE cmd
  END as status
FROM pg_policies 
WHERE tablename IN ('users', 'purchases', 'picks', 'weekly_results', 'invitations')
ORDER BY tablename, cmd;
```

### 2. Test Deletion Process
Regularly test the user deletion process with test accounts to ensure it works correctly.

### 3. Monitor Logs
Check the application logs for detailed error messages when deletion fails.

## Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Service Role Documentation](https://supabase.com/docs/guides/auth/service-role)
- [Database Schema Files](../database-schema.sql)

## Support

If you continue to experience issues after trying these solutions:

1. Check the browser console for detailed error messages
2. Review the server logs for API errors
3. Verify all environment variables are set correctly
4. Test with a fresh user account to isolate the issue

