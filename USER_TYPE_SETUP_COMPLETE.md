# User Type System Setup - Complete Implementation

## ✅ What Has Been Implemented

### 1. Database Schema & Triggers
- **File**: `update-user-types-system-v3.sql`
- **Status**: ✅ Complete
- **Features**:
  - User types: `registered`, `active`, `tester`, `eliminated`
  - Automatic transitions on signup, payment, and pick elimination
  - Database triggers for automatic user type updates
  - Default week assignment based on user type

### 2. TypeScript User Type Management
- **File**: `src/lib/user-types.ts`
- **Status**: ✅ Complete
- **Features**:
  - User type checking functions
  - Default week calculation based on user type
  - Week access control functions
  - User type update functions

### 3. Client-Side User Type Functions
- **File**: `src/lib/user-types-client.ts`
- **Status**: ✅ Complete
- **Features**:
  - Client-side user type checking
  - API calls to server-side functions

### 4. API Endpoints
- **Files**: 
  - `src/app/api/user-type/is-tester/route.ts` ✅
  - `src/app/api/user-type/default-week/route.ts` ✅
  - `src/app/api/current-week-display/route.ts` ✅ (Updated)
  - `src/app/api/matchups/route.ts` ✅ (Updated)
- **Status**: ✅ Complete
- **Features**:
  - User-specific week display
  - User-specific matchup loading
  - Tester status checking
  - Default week retrieval

### 5. Stripe Integration
- **File**: `src/app/api/stripe/webhook/route.ts`
- **Status**: ✅ Complete
- **Features**:
  - Automatic user type update to 'active' when payment completes
  - User type transition from 'registered' to 'active'

### 6. Admin Management
- **File**: `src/app/api/admin/update-user-types/route.ts`
- **Status**: ✅ Complete
- **Features**:
  - Manual user type updates
  - User type analysis and reporting
  - Bulk user type corrections

## 🚀 Setup Instructions

### Step 1: Run Database Migration
Execute the SQL file in your Supabase SQL editor:

```sql
-- Run the complete user type system setup
-- Copy and paste the contents of update-user-types-system-v3.sql
```

### Step 2: Verify Database Setup
Check that the system is working:

```sql
-- Check user types
SELECT user_type, COUNT(*) as count 
FROM users 
GROUP BY user_type 
ORDER BY user_type;

-- Check default weeks
SELECT user_type, default_week, COUNT(*) as count 
FROM users 
GROUP BY user_type, default_week 
ORDER BY user_type, default_week;
```

### Step 3: Test User Type Transitions

#### Test 1: New User Registration
1. Create a new user account
2. Verify user type is 'registered'
3. Verify default week is 1 (Regular Season Week 1)

#### Test 2: Payment Completion
1. Complete a Stripe payment
2. Verify user type changes to 'active'
3. Verify default week remains 1

#### Test 3: Tester Assignment
1. Assign a user as 'tester' via admin panel
2. Verify user type is 'tester'
3. Verify default week is 3 (Preseason Week 3)

#### Test 4: Pick Elimination
1. Eliminate all user picks
2. Verify user type changes to 'eliminated'

## 🎯 Expected Behavior

### User Types & Week Access

| User Type | Default Week | Dashboard Shows | Can Access |
|-----------|--------------|-----------------|------------|
| **Registered** | 1 | Week 1 Regular Season | Regular Season Only |
| **Active** | 1 | Week 1 Regular Season | Regular Season Only |
| **Tester** | 3 | Preseason Week 3 | All Weeks (Including Preseason) |
| **Eliminated** | 1 | Week 1 Regular Season | Regular Season Only |

### Automatic Transitions

1. **Signup** → `registered`
2. **Payment Complete** → `active`
3. **All Picks Eliminated** → `eliminated`
4. **Tester** → Never changes (special status)

## 🔧 Testing Commands

### Check User Types
```bash
# API endpoint to check user types
curl "https://your-domain.com/api/admin/update-user-types"
```

### Test Week Display
```bash
# Test current week display for authenticated user
curl "https://your-domain.com/api/current-week-display"
```

### Test Matchups
```bash
# Test matchups for authenticated user
curl "https://your-domain.com/api/matchups"
```

## 🐛 Troubleshooting

### Issue: Users Still See Wrong Week
**Solution**: 
1. Check if the SQL migration ran successfully
2. Verify user types in database: `SELECT user_type, default_week FROM users;`
3. Check API responses for user-specific week data
4. Clear browser cache and reload

### Issue: User Types Not Updating
**Solution**:
1. Check database triggers are active
2. Verify purchase completion webhook is working
3. Run manual user type update: `POST /api/admin/update-user-types`

### Issue: Testers Can't Access Preseason
**Solution**:
1. Verify tester has `user_type = 'tester'` in database
2. Check `default_week = 3` for testers
3. Ensure preseason matchups exist in database

## 📊 Monitoring

### Key Metrics to Watch
- User type distribution
- Week access patterns
- User type transition success rates
- API response times

### Database Queries for Monitoring
```sql
-- User type distribution
SELECT user_type, COUNT(*) as count 
FROM users 
GROUP BY user_type;

-- Default week distribution
SELECT default_week, COUNT(*) as count 
FROM users 
GROUP BY default_week;

-- Recent user type changes
SELECT user_type, created_at 
FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

## ✅ Completion Checklist

- [ ] Run `update-user-types-system-v3.sql` in Supabase
- [ ] Verify user types are set correctly in database
- [ ] Test new user registration → `registered`
- [ ] Test payment completion → `active`
- [ ] Test tester assignment → `tester` with week 3
- [ ] Test pick elimination → `eliminated`
- [ ] Verify dashboard shows correct weeks for each user type
- [ ] Test API endpoints return user-specific data
- [ ] Verify admin panel can manage user types

## 🎉 Success Indicators

✅ **Dashboard shows correct week based on user type**
✅ **Testers see Preseason Week 3**
✅ **Regular users see Regular Season Week 1**
✅ **User types update automatically**
✅ **APIs return user-specific data**

The user type system is now fully implemented and should display the correct weeks based on user types!
