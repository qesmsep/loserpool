import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    // Handle authentication - try bearer token first, then cookies
    let authenticatedUser = null;
    
    // Check for bearer token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔍 Admin results API: Using bearer token authentication');
      
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return [];
            },
            setAll() {
              // No-op for API routes
            },
          },
        }
      );
      
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error('Bearer token auth error:', error.message);
      } else if (user) {
        authenticatedUser = user;
        console.log('✅ Bearer token authentication successful for user:', user.email);
      }
    }
    
    // Fall back to cookie-based authentication
    if (!authenticatedUser) {
      console.log('🔍 Admin results API: Falling back to cookie authentication');
      
      try {
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll();
              },
              setAll() {
                // No-op for API routes
              },
            },
          }
        );
        
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Cookie session error:', error.message);
        } else if (session?.user) {
          authenticatedUser = session.user;
          console.log('✅ Cookie authentication successful for user:', session.user.email);
        }
      } catch (error) {
        console.error('Cookie authentication error:', error);
      }
    }
    
    // If no authenticated user, return 401
    if (!authenticatedUser) {
      console.log('❌ No authenticated user found for admin results API');
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin using service role client
    const supabaseAdmin = createServiceRoleClient();
    const { data: userProfile, error: adminError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', authenticatedUser.id)
      .single();
    
    console.log('🔍 Admin check result:', {
      hasProfile: !!userProfile,
      isAdmin: userProfile?.is_admin,
      error: adminError?.message
    });
    
    if (adminError) {
      console.error('Admin check error:', adminError.message);
      return NextResponse.json({ error: 'Admin verification failed' }, { status: 403 });
    }
    
    if (!userProfile?.is_admin) {
      console.log('❌ User is not admin:', authenticatedUser.email);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    console.log('✅ User is admin, proceeding with data fetch');
    
    // Get all matchups with picks data using service role client
    const { data: matchups, error: matchupsError } = await supabaseAdmin
      .from('matchups')
      .select(`
        *,
        picks!inner(
          picks_count,
          status,
          team_picked
        )
      `)
      .order('week', { ascending: false })
      .order('get_season_order(season)', { ascending: true })
      .order('game_time', { ascending: true });
    
    if (matchupsError) {
      console.error('Error fetching matchups:', matchupsError.message);
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 });
    }
    
    console.log('✅ Admin results API: Success for user:', authenticatedUser.email);
    return NextResponse.json({
      matchups: matchups || [],
      success: true
    });
    
  } catch (error) {
    console.error('Admin results API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
