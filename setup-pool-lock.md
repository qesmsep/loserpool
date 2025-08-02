# Pool Lock Setup Guide

## Overview
The app now includes a pool lock feature that prevents new registrations and purchases after 11:59 PM on August 31, 2025. This ensures the pool is closed before the season starts.

## Features
- ✅ **Automatic Lock**: Pool locks automatically at specified date/time
- ✅ **Manual Override**: Admins can manually lock/unlock the pool
- ✅ **Registration Block**: Prevents new user registrations when locked
- ✅ **Purchase Block**: Prevents new pick purchases when locked
- ✅ **Visual Indicators**: Shows lock status on landing page
- ✅ **Countdown Warnings**: Shows time remaining before lock

## Database Setup

### 1. Add Pool Lock Settings
The following settings are automatically added to `global_settings`:
- `pool_lock_date`: '2025-08-31 23:59:00' (when pool locks)
- `pool_locked`: 'false' (manual override flag)

### 2. Update Existing Database
If you have an existing database, run this SQL:
```sql
INSERT INTO global_settings (key, value) VALUES 
('pool_lock_date', '2025-08-31 23:59:00'),
('pool_locked', 'false')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

## How It Works

### Lock Logic
The pool is considered locked if:
1. **Manual lock** is enabled (`pool_locked = 'true'`), OR
2. **Current time** is past the lock date (`pool_lock_date`)

### Affected Features
When locked, the following are blocked:
- ✅ **User Registration**: Signup page shows "Pool is Locked" message
- ✅ **Pick Purchases**: Purchase page and Stripe checkout blocked
- ✅ **Landing Page**: Shows lock status and countdown warnings
- ✅ **API Endpoints**: Server-side validation prevents purchases

### Visual Indicators
- **Locked**: Red banner with "🚫 Pool is Locked" message
- **Warning**: Yellow banner with countdown when < 24 hours remaining
- **Open**: Normal registration/purchase flow

## Admin Controls

### Manual Lock/Unlock
Admins can manually control the pool lock:
```sql
-- Lock the pool immediately
UPDATE global_settings SET value = 'true' WHERE key = 'pool_locked';

-- Unlock the pool
UPDATE global_settings SET value = 'false' WHERE key = 'pool_locked';

-- Change lock date
UPDATE global_settings SET value = '2025-09-01 23:59:00' WHERE key = 'pool_lock_date';
```

### Admin Panel Integration
Add pool lock controls to admin settings page:
- Toggle manual lock
- Change lock date
- View current status
- Preview affected users

## Testing

### 1. Test Lock Functionality
```sql
-- Set lock date to past time for testing
UPDATE global_settings SET value = '2025-01-01 00:00:00' WHERE key = 'pool_lock_date';

-- Verify lock status
SELECT * FROM global_settings WHERE key IN ('pool_lock_date', 'pool_locked');
```

### 2. Test User Experience
1. **Before Lock**: Users can register and purchase normally
2. **After Lock**: Registration and purchase blocked with clear messages
3. **Warning Period**: Shows countdown when < 24 hours remaining

### 3. Test API Endpoints
```bash
# Test registration (should be blocked when locked)
curl -X POST /api/auth/signup

# Test purchase (should be blocked when locked)
curl -X POST /api/stripe/create-checkout-session
```

## Integration Points

### Landing Page
- Shows lock status prominently
- Displays countdown warnings
- Hides registration links when locked

### Signup Page
- Checks pool status before registration
- Shows clear error message if locked
- Prevents form submission

### Purchase Page
- Validates pool status before purchase
- Shows lock message if blocked
- Prevents Stripe checkout

### Stripe API
- Server-side validation in checkout session
- Returns error if pool is locked
- Prevents payment processing

## Monitoring

### Logs to Watch
- Registration attempts when locked
- Purchase attempts when locked
- Lock status changes
- Countdown warnings

### Common Issues
1. **Time Zone Issues**: Ensure lock date uses correct timezone
2. **Manual Override**: Check if manual lock is enabled
3. **Cache Issues**: Clear browser cache if status doesn't update
4. **API Errors**: Verify pool status function is working

## Customization

### Lock Date
Change the lock date in `global_settings`:
```sql
UPDATE global_settings SET value = '2025-09-15 23:59:00' WHERE key = 'pool_lock_date';
```

### Warning Period
Modify the warning threshold in `pool-status.ts`:
```typescript
// Change from 24 hours to 48 hours
if (status.timeUntilLock && status.timeUntilLock < 48 * 60 * 60 * 1000)
```

### Lock Messages
Customize lock messages in the UI components:
- Landing page banner
- Registration error message
- Purchase error message

## Security

### Validation Layers
- ✅ **Client-side**: UI shows lock status immediately
- ✅ **Server-side**: API endpoints validate before processing
- ✅ **Database**: Settings stored securely in global_settings
- ✅ **Admin-only**: Manual lock controls require admin access

### Bypass Prevention
- All registration/purchase flows check pool status
- Server-side validation prevents client-side bypass
- Admin controls require authentication
- Audit trail for lock changes

## Future Enhancements

### Advanced Features
- **Gradual Lock**: Different restrictions at different times
- **Partial Lock**: Allow purchases but not registrations
- **Lock Notifications**: Email users before pool locks
- **Lock History**: Track when and why pool was locked
- **Conditional Lock**: Lock based on entry count or other criteria 