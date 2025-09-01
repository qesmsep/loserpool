# Next.js Authentication and Redirect Error Fix

## Problem Description

The application was experiencing "NEXT_REDIRECT" errors in the console when API routes were accessed without valid sessions. This happened because:

1. API routes were redirecting to `/login` when no session was found
2. Next.js logs these redirects as errors (though they're expected behavior)
3. The middleware wasn't properly differentiating between API routes and page routes

## Root Cause

The issue was in the authentication flow:
- API routes were using `requireAuth()` which calls `redirect('/login')` 
- This caused Next.js to log "NEXT_REDIRECT" errors during fetch requests
- The middleware wasn't handling API routes differently from page routes

## Solution Implemented

### 1. Updated Middleware (`src/middleware.ts`)

The middleware now properly differentiates between API routes and page routes:

```typescript
const url = new URL(request.url)
const isApi = url.pathname.startsWith('/api/')
const isProtectedRoute = url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/admin/')

// Check if we need to handle authentication for protected routes
if (isProtectedRoute) {
  if (!session) {
    if (isApi) {
      // For API routes, return 401 JSON instead of redirecting
      console.log('API route without session, returning 401')
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    } else {
      // For page routes, redirect to login
      console.log('Protected page without session, redirecting to login')
      return NextResponse.redirect(new URL('/login', url))
    }
  }
}
```

### 2. API Routes Already Using Correct Pattern

The API routes were already using `requireAuthForAPI()` which throws errors instead of redirecting:

```typescript
export async function requireAuthForAPI() {
  // ... authentication logic ...
  if (!user) {
    console.log('No user found in API route')
    throw new Error('Authentication required')
  }
  return user
}
```

### 3. Updated Client-Side Fetch Calls

Added `credentials: 'include'` to all fetch calls that need authentication:

**Files Updated:**
- `src/app/admin/users/page.tsx` - All admin API calls
- `src/app/dashboard/page.tsx` - Week display and matchups API calls  
- `src/app/pick-history/[pickId]/page.tsx` - Pick history API call
- `src/components/pick-history-table.tsx` - Season pick history API call

**Example:**
```typescript
const response = await fetch('/api/admin/users', {
  credentials: 'include'
})
```

## Key Changes Made

### Middleware Updates
- Added route type detection (`isApi`, `isProtectedRoute`)
- Return 401 JSON for API routes without sessions
- Only redirect page routes to login
- Enhanced logging for debugging

### Client-Side Updates  
- Added `credentials: 'include'` to all authenticated fetch calls
- Ensures cookies are sent with cross-origin requests
- Maintains session state across API calls

## Benefits

1. **Eliminates NEXT_REDIRECT Errors**: API routes no longer redirect, preventing console noise
2. **Proper Error Handling**: API routes return appropriate 401 status codes
3. **Better UX**: Page routes still redirect to login as expected
4. **Consistent Authentication**: All client-side calls include credentials
5. **Improved Debugging**: Enhanced logging in middleware

## Testing

To verify the fix:

1. **API Routes**: Should return 401 JSON when accessed without session
2. **Page Routes**: Should redirect to `/login` when accessed without session  
3. **Console**: Should no longer show NEXT_REDIRECT errors
4. **Authentication**: Should work properly for both API and page routes

## Files Modified

- `src/middleware.ts` - Updated authentication logic
- `src/app/admin/users/page.tsx` - Added credentials to fetch calls
- `src/app/dashboard/page.tsx` - Added credentials to fetch calls
- `src/app/pick-history/[pickId]/page.tsx` - Added credentials to fetch calls
- `src/components/pick-history-table.tsx` - Added credentials to fetch calls

## Notes

- The `requireAuthForAPI()` function was already correctly implemented
- Most API routes were already using the correct pattern
- The main issue was in middleware and missing `credentials: 'include'` in fetch calls
- This follows Next.js best practices for API route authentication
