# User Type System Documentation

## Overview

The Loser Pool implements a comprehensive user type system that automatically manages user states based on their account status, purchases, and pick performance. This system ensures users see the appropriate content and have the correct permissions based on their current status.

## User Types

### 1. Registered
- **Definition**: Has account, but no picks purchased
- **Dashboard Access**: Week 1 of Regular Season
- **Purchase Ability**: Can purchase picks normally
- **Pick Access**: Cannot make picks until purchase is completed
- **Transition**: Automatically becomes "Active" when payment is completed

### 2. Active
- **Definition**: Has purchased picks available to pick
- **Dashboard Access**: Week 1 of Regular Season
- **Purchase Ability**: Can purchase additional picks
- **Pick Access**: Can allocate picks to matchups
- **Transition**: Becomes "Eliminated" when all picks are eliminated

### 3. Tester
- **Definition**: A Registered User with ability to purchase picks for $0 (admin-assigned only)
- **Dashboard Access**: Week 3 of PreSeason
- **Purchase Ability**: Can purchase picks for $0
- **Pick Access**: Can access all weeks including preseason
- **Transition**: Never changes (special admin status)

### 4. Eliminated
- **Definition**: Has purchased tickets but all picks have been eliminated
- **Dashboard Access**: Same as Active users (Week 1 of Regular Season)
- **Purchase Ability**: Cannot purchase additional picks
- **Pick Access**: Can view results but cannot make new picks
- **Transition**: Final state (cannot return to Active)

## Automatic Transitions

### Signup Process
1. **New User Signs Up** → Automatically assigned as "Registered"
2. **User Completes Payment** → Automatically becomes "Active"
3. **User Makes Picks** → Remains "Active" while picks are active
4. **All Picks Eliminated** → Automatically becomes "Eliminated"

### Database Triggers

The system uses PostgreSQL triggers to automatically manage user type transitions:

#### Purchase Completion Trigger
```sql
-- Triggered when purchase status changes to 'completed'
-- Updates user_type from 'registered' to 'active'
```

#### Pick Status Trigger
```sql
-- Triggered when pick status changes
-- Updates user_type based on active/eliminated pick counts
```

## Week Access Control

### Tester Users
- **Minimum Accessible Week**: 0 (Preseason)
- **Default Week**: 3 (Preseason Week 3)
- **Can Access**: All weeks including preseason

### All Other Users
- **Minimum Accessible Week**: 1 (Regular Season)
- **Default Week**: 1 (Regular Season Week 1)
- **Can Access**: Regular season weeks only

## Implementation Files

### Database Schema
- `update-user-types-system-v3.sql` - Main database setup and triggers
- `add-user-type-field.sql` - Initial user type field addition

### TypeScript Implementation
- `src/lib/user-types.ts` - User type management functions
- `src/app/api/stripe/webhook/route.ts` - Payment completion handling
- `src/app/api/admin/update-user-types/route.ts` - Admin user type management

### Key Functions

#### `getUserDefaultWeek(userId: string)`
Returns the default week a user should see based on their type.

#### `updateUserTypeBasedOnPicks(userId: string)`
Updates user type based on current picks status.

#### `updateUserTypeToActive(userId: string)`
Updates user type to 'active' when purchase is completed.

#### `updateUserTypeToEliminated(userId: string)`
Updates user type to 'eliminated' when all picks are eliminated.

## Admin Management

### Manual User Type Updates
Admins can manually update user types through the API endpoint:
- `POST /api/admin/update-user-types` - Update all user types
- `GET /api/admin/update-user-types` - Analyze current user types

### Tester Assignment
Testers are assigned through the admin panel and have special privileges:
- Can purchase picks for $0
- Can access preseason weeks
- User type never changes automatically

## Testing the System

### 1. Test User Registration
```sql
-- Check new user is registered
SELECT user_type FROM users WHERE email = 'newuser@example.com';
-- Should return: 'registered'
```

### 2. Test Purchase Completion
```sql
-- Complete a purchase
UPDATE purchases SET status = 'completed' WHERE user_id = 'user-id';
-- Check user type changed to active
SELECT user_type FROM users WHERE id = 'user-id';
-- Should return: 'active'
```

### 3. Test Pick Elimination
```sql
-- Eliminate all user picks
UPDATE picks SET status = 'eliminated' WHERE user_id = 'user-id';
-- Check user type changed to eliminated
SELECT user_type FROM users WHERE id = 'user-id';
-- Should return: 'eliminated'
```

## Error Handling

### Database Constraints
- User type must be one of: 'registered', 'active', 'tester', 'eliminated'
- Triggers handle automatic transitions
- Admin users are automatically assigned as testers

### Application Logic
- TypeScript functions validate user types before operations
- API endpoints check user permissions based on type
- Dashboard shows appropriate content based on user type

## Monitoring

### User Type Distribution
```sql
-- Check current user type distribution
SELECT user_type, COUNT(*) as count 
FROM users 
GROUP BY user_type 
ORDER BY user_type;
```

### Transition Logging
The system logs all user type transitions for debugging and monitoring purposes.

## Future Enhancements

### Potential Additions
1. **User Type History** - Track all user type changes over time
2. **Manual Override** - Allow admins to manually set user types
3. **Bulk Operations** - Mass update user types for testing
4. **Email Notifications** - Notify users when their type changes
5. **Analytics Dashboard** - Visual representation of user type distribution

### Integration Points
- **Leaderboard System** - Filter users by type
- **Email System** - Send type-specific communications
- **Admin Panel** - Enhanced user management interface
- **Reporting** - User type analytics and insights
