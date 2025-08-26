-- Database Snapshot Before RLS Fixes
-- Run this BEFORE applying the RLS security fixes
-- This creates a complete backup of your current database state

-- Create backup timestamp
DO $$
DECLARE
    backup_timestamp TEXT := to_char(now(), 'YYYYMMDD_HH24MISS');
    backup_schema TEXT := 'backup_' || backup_timestamp;
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE 'Creating database snapshot: %', backup_schema;
    
    -- Create backup schema
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || backup_schema;
    
    -- Backup all tables with data (only if they exist)
    -- Users table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.users AS SELECT * FROM public.users';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.users_structure AS SELECT * FROM public.users WHERE false';
        RAISE NOTICE 'Backed up users table';
    ELSE
        RAISE NOTICE 'Users table does not exist - skipping';
    END IF;
    
    -- Purchases table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchases') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.purchases AS SELECT * FROM public.purchases';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.purchases_structure AS SELECT * FROM public.purchases WHERE false';
        RAISE NOTICE 'Backed up purchases table';
    ELSE
        RAISE NOTICE 'Purchases table does not exist - skipping';
    END IF;
    
    -- Matchups table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'matchups') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.matchups AS SELECT * FROM public.matchups';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.matchups_structure AS SELECT * FROM public.matchups WHERE false';
        RAISE NOTICE 'Backed up matchups table';
    ELSE
        RAISE NOTICE 'Matchups table does not exist - skipping';
    END IF;
    
    -- Picks table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'picks') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.picks AS SELECT * FROM public.picks';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.picks_structure AS SELECT * FROM public.picks WHERE false';
        RAISE NOTICE 'Backed up picks table';
    ELSE
        RAISE NOTICE 'Picks table does not exist - skipping';
    END IF;
    
    -- Weekly results table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'weekly_results') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.weekly_results AS SELECT * FROM public.weekly_results';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.weekly_results_structure AS SELECT * FROM public.weekly_results WHERE false';
        RAISE NOTICE 'Backed up weekly_results table';
    ELSE
        RAISE NOTICE 'Weekly_results table does not exist - skipping';
    END IF;
    
    -- Invitations table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.invitations AS SELECT * FROM public.invitations';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.invitations_structure AS SELECT * FROM public.invitations WHERE false';
        RAISE NOTICE 'Backed up invitations table';
    ELSE
        RAISE NOTICE 'Invitations table does not exist - skipping';
    END IF;
    
    -- Global settings table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'global_settings') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.global_settings AS SELECT * FROM public.global_settings';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.global_settings_structure AS SELECT * FROM public.global_settings WHERE false';
        RAISE NOTICE 'Backed up global_settings table';
    ELSE
        RAISE NOTICE 'Global_settings table does not exist - skipping';
    END IF;
    
    -- Teams table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'teams') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.teams AS SELECT * FROM public.teams';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.teams_structure AS SELECT * FROM public.teams WHERE false';
        RAISE NOTICE 'Backed up teams table';
    ELSE
        RAISE NOTICE 'Teams table does not exist - skipping';
    END IF;
    
    -- Leaderboard table
    SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'leaderboard') INTO table_exists;
    IF table_exists THEN
        EXECUTE 'CREATE TABLE ' || backup_schema || '.leaderboard AS SELECT * FROM public.leaderboard';
        EXECUTE 'CREATE TABLE ' || backup_schema || '.leaderboard_structure AS SELECT * FROM public.leaderboard WHERE false';
        RAISE NOTICE 'Backed up leaderboard table';
    ELSE
        RAISE NOTICE 'Leaderboard table does not exist - skipping';
    END IF;
    
    -- Backup RLS policies
    CREATE TABLE backup_policies AS
    SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual,
        with_check
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    -- Backup table structures and RLS status
    CREATE TABLE backup_table_info AS
    SELECT 
        schemaname,
        tablename,
        rowsecurity as rls_enabled,
        hasindexes,
        hasrules,
        hastriggers
    FROM pg_tables 
    WHERE schemaname = 'public';
    
    -- Create backup metadata
    CREATE TABLE backup_metadata (
        backup_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        backup_schema TEXT,
        description TEXT,
        tables_backed_up INTEGER,
        policies_backed_up INTEGER
    );
    
    INSERT INTO backup_metadata (backup_schema, description, tables_backed_up, policies_backed_up)
    VALUES (
        backup_schema,
        'Database snapshot before RLS security fixes',
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = backup_schema),
        (SELECT COUNT(*) FROM backup_policies)
    );
    
    RAISE NOTICE 'Database snapshot created successfully in schema: %', backup_schema;
    RAISE NOTICE 'Backup includes all data, table structures, and RLS policies';
    RAISE NOTICE 'To restore, use the restore script with schema: %', backup_schema;
    
END $$;

-- Show backup summary
SELECT 
    backup_timestamp,
    backup_schema,
    description,
    tables_backed_up,
    policies_backed_up
FROM backup_metadata 
ORDER BY backup_timestamp DESC 
LIMIT 1;

-- Show what was backed up
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname LIKE 'backup_%'
ORDER BY schemaname, tablename;

-- Show current RLS policies (for reference)
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
