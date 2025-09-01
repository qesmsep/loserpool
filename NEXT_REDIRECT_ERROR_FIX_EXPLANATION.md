# NEXT_REDIRECT Error Fix - Developer Documentation

## Problem Summary
The `NEXT_REDIRECT` error occurred because Next.js API routes cannot use the `redirect()` function. When `requireAuth()` was called in API routes, it attempted to redirect unauthenticated users to `/login`, which caused a `NEXT_REDIRECT` error instead of a proper HTTP response.

## Changes Made

### 1. Created New Authentication Function (`src/lib/auth.ts`)
```typescript
// NEW FUNCTION ADDED
export async function requireAuthForAPI() {
  const user = await getCurrentUser()
  
  if (!user) {
    console.log('No user found in API route')
    throw new Error('Authentication required')  // Throws error instead of redirecting
  }
  
  console.log('User authenticated:', user.email)
  return user
}
```

### 2. Updated All API Routes to Use New Function
Changed the import and function call in these files:
- `src/app/api/picks/available/route.ts`
- `src/app/api/users/create-profile/route.ts`
- `src/app/api/picks/history-season/[pickId]/route.ts`
- `src/app/api/picks/deallocate/route.ts`
- `src/app/api/picks/get-team-matchup-id/route.ts`
- `src/app/api/picks/matchup-picks/route.ts`
- `src/app/api/picks/history/[pickId]/route.ts`

**Before:**
```typescript
import { requireAuth } from '@/lib/auth'
// ...
const user = await requireAuth()  // This would redirect() in API routes
```

**After:**
```typescript
import { requireAuthForAPI } from '@/lib/auth'
// ...
const user = await requireAuthForAPI()  // This throws an error instead
```

### 3. Added Error Handling in All API Routes
Added try-catch blocks to handle the authentication error:

```typescript
} catch (error) {
  console.error('Error in API:', error)
  
  // NEW: Handle authentication errors specifically
  if (error instanceof Error && error.message === 'Authentication required') {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }  // Return 401 instead of 500
    )
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  )
}
```

## Potential Issues This Could Cause

### 1. Frontend Authentication Handling
**Problem:** Frontend code might not be handling 401 responses properly.

**What to check:**
- Look for API calls that expect a redirect but now get a 401
- Check if frontend has proper error handling for 401 status codes
- Verify that authentication state management still works correctly

**Files to examine:**
- `src/components/auth-provider.tsx` - Check how it handles auth state
- Any components that make API calls to the affected routes
- `src/middleware.ts` - Check if it handles authentication differently

### 2. Missing API Routes
**Problem:** Some API routes might still use `requireAuth()`.

**What to check:**
```bash
grep -r "requireAuth()" src/app/api/
```

**Common places to look:**
- `src/app/api/picks/allocate/route.ts`
- `src/app/api/stripe/create-checkout-session/route.ts`
- `src/app/api/purchases/free/route.ts`
- Any other API routes that require authentication

### 3. Error Response Format Changes
**Problem:** Frontend might expect different error response formats.

**Before:** API routes would crash with `NEXT_REDIRECT` error
**After:** API routes return `{ error: 'Authentication required' }` with 401 status

**What to check:**
- Frontend error handling for API responses
- Any error boundaries or global error handlers
- Components that display error messages

### 4. Authentication Flow Disruption
**Problem:** The authentication flow might be broken if the frontend expects redirects.

**What to check:**
- Login/logout flows
- Protected route handling
- Session management
- Redirect logic after authentication

## How to Debug and Fix Issues

### 1. Check Browser Network Tab
Look for API calls that return 401 status codes and see how your frontend handles them.

### 2. Check Console for Errors
Look for JavaScript errors related to authentication or API calls.

### 3. Test Authentication Flow
- Try logging in/out
- Access protected pages
- Make API calls while logged out
- Check if redirects work properly

### 4. Update Missing API Routes
If you find API routes still using `requireAuth()`, update them:

```typescript
// Change this:
import { requireAuth } from '@/lib/auth'
const user = await requireAuth()

// To this:
import { requireAuthForAPI } from '@/lib/auth'
const user = await requireAuthForAPI()
```

### 5. Update Frontend Error Handling
Make sure your frontend properly handles 401 responses:

```typescript
// Example of proper error handling
try {
  const response = await fetch('/api/picks/available')
  if (response.status === 401) {
    // Handle authentication required
    redirect('/login')  // or update auth state
  }
  // Handle other responses
} catch (error) {
  // Handle network errors
}
```

## Files That Might Need Attention

Check these specifically:

1. **`src/components/auth-provider.tsx`** - Authentication state management
2. **`src/middleware.ts`** - Route protection logic
3. **`src/app/api/picks/allocate/route.ts`** - Might still use `requireAuth()`
4. **`src/app/api/stripe/create-checkout-session/route.ts`** - Might need updating
5. **`src/app/api/purchases/free/route.ts`** - Might need updating
6. **`src/components/pick-selection-popup.tsx`** - API call error handling
7. **`src/app/purchase/page.tsx`** - API call error handling

## Quick Fix Commands

If you find issues, you can quickly revert the changes:

```bash
# Revert the auth.ts changes
git checkout HEAD~1 src/lib/auth.ts

# Revert all API route changes
git checkout HEAD~1 src/app/api/picks/available/route.ts
git checkout HEAD~1 src/app/api/users/create-profile/route.ts
# ... etc for other files
```

## Core Issue and Solution
The core issue was that API routes can't use `redirect()`, so the solution was to throw errors instead and handle them properly. This is the correct approach, but it requires the frontend to handle 401 responses appropriately.

## Original Error Message
```
2025-09-01T00:18:36.771Z [info] No user found, redirecting to login
2025-09-01T00:18:36.772Z [error] Error in available picks API: Error: NEXT_REDIRECT
    at g (.next/server/app/api/picks/available/route.js:5:14683)
    at h (.next/server/app/api/picks/available/route.js:5:14976)
    at g (.next/server/app/api/picks/available/route.js:5:8365)
    at async A (.next/server/app/api/picks/available/route.js:1:1146)
    at async k (.next/server/app/api/picks/available/route.js:5:3555)
    at async g (.next/server/app/api/picks/available/route.js:5:4558) {
  digest: 'NEXT_REDIRECT;replace;/login;307;'
}
```

## Status
✅ **FIXED** - All changes have been applied and committed to the repository.

### ✅ **BEARER TOKEN FIXES IMPLEMENTED**

**Server-Side Fixes Applied:**
- ✅ `src/app/api/picks/available/route.ts` - Updated with bearer token handling
- ✅ `src/app/api/picks/allocate/route.ts` - Updated with bearer token handling  
- ✅ `src/app/api/purchases/free/route.ts` - Updated with bearer token handling
- ✅ `src/app/api/stripe/create-checkout-session/route.ts` - Updated with bearer token handling

**Client-Side Fixes Verified:**
- ✅ `src/components/pick-selection-popup.tsx` - Already implementing Authorization headers correctly
- ✅ `src/app/purchase/page.tsx` - Already implementing Authorization headers correctly

**Pattern Implemented:**
```typescript
// Server-side: Conditional client creation and authentication
const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
const hasBearer = !!authHeader && authHeader.toLowerCase().startsWith('bearer ')

const supabase = hasBearer
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader! } }
    })
  : await createServerSupabaseClient()

// Client-side: Authorization header in fetch requests
const { data: { session } } = await supabase.auth.getSession()
const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}

await fetch('/api/endpoint', {
  headers: {
    'Content-Type': 'application/json',
    ...authHeaders,
  },
})
```

---

## ADDITIONAL AUTHENTICATION FIXES NEEDED

### New Issue: Bearer Token vs Cookie Session Mismatch

**Problem:** The client is successfully signed in, but API routes are treating the user as anonymous.

**Symptoms:**
- Client-side: `Auth state change: SIGNED_IN tim@828.life ✓` (successful client-side authentication)
- Server-side: `Server middleware + route: "No session found ... hasSession: false"` even with `Authorization: Bearer` header

### Root Cause
1. **`getSession()` vs Bearer Tokens:** `supabase.auth.getSession()` looks for cookie sessions, not bearer tokens
2. **Route Builds Cookie Client for Bearer Tokens:** Even with bearer tokens, routes were calling `createServerSupabaseClient()` and `auth.getSession()`

### Server-Side Fix

Update each API route to:
1. Detect the `Authorization` header
2. If present, build a bearer client and call `auth.getUser()` (not `getSession`)
3. Use that client for all database calls
4. Fall back to cookie session only if no `Authorization` header is present

**TypeScript Code Example (`/api/picks/available/route.ts`):**

```typescript
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET() {
  // Get headers
  const h = headers()
  const authHeader = h.get('authorization')
  const hasBearer = !!authHeader && authHeader.toLowerCase().startsWith('bearer ')

  // Conditional Supabase client creation
  const supabase = hasBearer
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { headers: { Authorization: authHeader! } }
      })
    : await createServerSupabaseClient()

  // Conditional authentication
  if (hasBearer) {
    // Bearer Token
    const { data: { user }, error } = await supabase.auth.getUser()
    console.log({ authMethod: 'bearer', hasUser: !!user, error: error?.message })
    
    if (error || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }
    const userId = user.id
  } else {
    // Cookie Session
    const { data: { session }, error } = await supabase.auth.getSession()
    console.log({ authMethod: 'cookie', hasSession: !!session, error: error?.message })
    
    if (error || !session) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 })
    }
    const userId = session.user.id
  }

  // ... use `supabase` for all queries, scoped as the authenticated userId
}
```

### Client-Side Fix

Send the access token in the header on your fetches:

```typescript
// Get session and create auth headers
const { data: { session } } = await supabase.auth.getSession()
const authHeaders = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}

// Use in fetch requests
await fetch('/api/picks/available', {
  method: 'GET',
  credentials: 'include', // fine to keep
  headers: {
    'Content-Type': 'application/json',
    ...authHeaders,
  },
})
```

**Apply this pattern to:**
- `/api/picks/available` (GET)
- `/api/picks/allocate` (POST)
- Any other API routes that require authentication

### Why This Resolves the Logs
1. **Middleware/route will stop relying on `getSession()`** when a bearer token is provided, so "hasSession: false" is no longer a blocker
2. **`getUser()` validates the bearer token** and yields `user.id`, so your route can proceed and stop returning 401

### Files That Need Updates
1. **Server-side:** All API routes using `requireAuthForAPI()` need the bearer token handling
2. **Client-side:** All fetch calls to authenticated endpoints need the Authorization header
3. **Key files to check:**
   - `src/components/pick-selection-popup.tsx` - API calls
   - `src/app/purchase/page.tsx` - API calls
   - `src/components/auth-provider.tsx` - Session management
