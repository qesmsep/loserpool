-- Database Restore Script
-- Use this to restore your database to a previous snapshot
-- Replace 'backup_YYYYMMDD_HHMMSS' with your actual backup schema name

-- Set the backup schema to restore from
DO $$
DECLARE
    backup_schema TEXT := 'backup_20241220_143000'; -- CHANGE THIS TO YOUR BACKUP SCHEMA
    table_name TEXT;
    policy_record RECORD;
BEGIN
    RAISE NOTICE 'Restoring database from backup schema: %', backup_schema;
    
    -- Check if backup schema exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = backup_schema) THEN
        RAISE EXCEPTION 'Backup schema % does not exist. Please check the schema name.', backup_schema;
    END IF;
    
    -- Drop all existing RLS policies first
    FOR policy_record IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || policy_record.tablename;
    END LOOP;
    
    RAISE NOTICE 'Dropped all existing RLS policies';
    
    -- Restore table data
    -- Users table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'users') THEN
        DELETE FROM public.users;
        EXECUTE 'INSERT INTO public.users SELECT * FROM ' || backup_schema || '.users';
        RAISE NOTICE 'Restored users table data';
    END IF;
    
    -- Purchases table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'purchases') THEN
        DELETE FROM public.purchases;
        EXECUTE 'INSERT INTO public.purchases SELECT * FROM ' || backup_schema || '.purchases';
        RAISE NOTICE 'Restored purchases table data';
    END IF;
    
    -- Matchups table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'matchups') THEN
        DELETE FROM public.matchups;
        EXECUTE 'INSERT INTO public.matchups SELECT * FROM ' || backup_schema || '.matchups';
        RAISE NOTICE 'Restored matchups table data';
    END IF;
    
    -- Picks table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'picks') THEN
        DELETE FROM public.picks;
        EXECUTE 'INSERT INTO public.picks SELECT * FROM ' || backup_schema || '.picks';
        RAISE NOTICE 'Restored picks table data';
    END IF;
    
    -- Weekly results table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'weekly_results') THEN
        DELETE FROM public.weekly_results;
        EXECUTE 'INSERT INTO public.weekly_results SELECT * FROM ' || backup_schema || '.weekly_results';
        RAISE NOTICE 'Restored weekly_results table data';
    END IF;
    
    -- Invitations table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'invitations') THEN
        DELETE FROM public.invitations;
        EXECUTE 'INSERT INTO public.invitations SELECT * FROM ' || backup_schema || '.invitations';
        RAISE NOTICE 'Restored invitations table data';
    END IF;
    
    -- Global settings table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'global_settings') THEN
        DELETE FROM public.global_settings;
        EXECUTE 'INSERT INTO public.global_settings SELECT * FROM ' || backup_schema || '.global_settings';
        RAISE NOTICE 'Restored global_settings table data';
    END IF;
    
    -- Teams table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'teams') THEN
        DELETE FROM public.teams;
        EXECUTE 'INSERT INTO public.teams SELECT * FROM ' || backup_schema || '.teams';
        RAISE NOTICE 'Restored teams table data';
    END IF;
    
    -- Leaderboard table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = backup_schema AND table_name = 'leaderboard') THEN
        DELETE FROM public.leaderboard;
        EXECUTE 'INSERT INTO public.leaderboard SELECT * FROM ' || backup_schema || '.leaderboard';
        RAISE NOTICE 'Restored leaderboard table data';
    END IF;
    
    -- Restore RLS settings
    -- Disable RLS on tables that had it disabled
    FOR table_name IN 
        SELECT tablename 
        FROM backup_table_info 
        WHERE rls_enabled = false
    LOOP
        EXECUTE 'ALTER TABLE ' || table_name || ' DISABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Disabled RLS on table: %', table_name;
    END LOOP;
    
    -- Enable RLS on tables that had it enabled
    FOR table_name IN 
        SELECT tablename 
        FROM backup_table_info 
        WHERE rls_enabled = true
    LOOP
        EXECUTE 'ALTER TABLE ' || table_name || ' ENABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'Enabled RLS on table: %', table_name;
    END LOOP;
    
    -- Restore RLS policies (this would need to be done manually based on the backup_policies table)
    RAISE NOTICE 'Please manually restore RLS policies from the backup_policies table if needed';
    
    RAISE NOTICE 'Database restore completed successfully from backup: %', backup_schema;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during restore: %', SQLERRM;
        RAISE;
END $$;

-- Show restore verification
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show current policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
