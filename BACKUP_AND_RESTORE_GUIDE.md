# Database Backup and Restore Guide

## 🛡️ Safety First: Create a Backup

Before applying any RLS security fixes, always create a backup of your current database state.

### Step 1: Create Database Snapshot

1. **Go to your Supabase SQL Editor**
2. **Run the backup script**: Copy and paste the contents of `create-database-snapshot.sql`
3. **Note the backup schema name** that gets created (e.g., `backup_20241220_143000`)

The backup script will:
- ✅ Create a complete copy of all your data
- ✅ Save all table structures
- ✅ Backup all RLS policies
- ✅ Create metadata about the backup

### Step 2: Verify Backup

After running the backup script, you should see:
- A success message with the backup schema name
- A summary of what was backed up
- A list of all backed up tables

## 🔧 Apply RLS Fixes

Once you have a backup, you can safely run the RLS fixes:

1. **Run the RLS fix script**: Copy and paste the contents of `fix-specific-rls-errors.sql`
2. **Verify the fixes worked**: Check that all three linter errors are resolved

## 🔄 Restore if Needed

If anything goes wrong, you can restore your database to the backup state:

### Step 1: Update Restore Script

1. **Open `restore-database-snapshot.sql`**
2. **Change the backup schema name** on line 7:
   ```sql
   backup_schema TEXT := 'backup_20241220_143000'; -- CHANGE THIS TO YOUR BACKUP SCHEMA
   ```
3. **Replace with your actual backup schema name** (from Step 1)

### Step 2: Run Restore

1. **Go to your Supabase SQL Editor**
2. **Run the restore script**: Copy and paste the updated contents of `restore-database-snapshot.sql`
3. **Verify restoration**: Check that your data is back to the original state

## 📋 What Gets Backed Up

The backup includes:

### Data Tables
- `users` - All user accounts and data
- `purchases` - All purchase records
- `matchups` - All game matchups
- `picks` - All user picks
- `weekly_results` - All weekly results
- `invitations` - All invitation codes
- `global_settings` - All global settings
- `teams` - Team data (if exists)
- `leaderboard` - Leaderboard data (if exists)

### Security Settings
- All RLS policies
- RLS enable/disable status for each table
- Table structures and constraints

## 🚨 Important Notes

1. **Backup Schema Names**: Each backup creates a unique schema like `backup_20241220_143000`
2. **Storage**: Backups are stored in your Supabase database, so they count toward your storage quota
3. **Cleanup**: You can delete old backup schemas when you're confident everything is working
4. **Testing**: Consider testing the restore process on a development database first

## 🎯 Quick Commands

### Create Backup
```sql
-- Run create-database-snapshot.sql
```

### Apply RLS Fixes
```sql
-- Run fix-specific-rls-errors.sql
```

### Restore from Backup
```sql
-- Update restore-database-snapshot.sql with your backup schema name
-- Run restore-database-snapshot.sql
```

### List All Backups
```sql
SELECT schema_name 
FROM information_schema.schemata 
WHERE schema_name LIKE 'backup_%'
ORDER BY schema_name DESC;
```

### Delete Old Backup
```sql
DROP SCHEMA backup_20241220_143000 CASCADE;
```

## ✅ Success Indicators

After running the RLS fixes, you should see:
- ✅ No more linter errors about RLS being disabled
- ✅ No more linter errors about user_metadata
- ✅ Your application continues to work normally
- ✅ Users can still make picks
- ✅ Admin functions still work

If anything breaks, you can always restore from your backup!
