-- Database Reset Script for The Loser Pool
-- WARNING: This will delete all data! Only run if you want to start completely fresh.

-- Drop all triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_purchases_updated_at ON purchases;
DROP TRIGGER IF EXISTS update_matchups_updated_at ON matchups;
DROP TRIGGER IF EXISTS update_picks_updated_at ON picks;
DROP TRIGGER IF EXISTS update_weekly_results_updated_at ON weekly_results;
DROP TRIGGER IF EXISTS update_invitations_updated_at ON invitations;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop all tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS weekly_results CASCADE;
DROP TABLE IF EXISTS picks CASCADE;
DROP TABLE IF EXISTS matchups CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Now you can run the database-schema-basic.sql script to recreate everything fresh 