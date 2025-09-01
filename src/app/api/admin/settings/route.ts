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
      console.log('🔍 Admin settings API: Using bearer token authentication');
      
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
      console.log('🔍 Admin settings API: Falling back to cookie authentication');
      
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
      console.log('❌ No authenticated user found for admin settings API');
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
    
    // Get global settings using service role client
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('global_settings')
      .select('*')
      .order('key');
    
    if (settingsError) {
      console.error('Error fetching settings:', settingsError.message);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
    
    // Get completed purchases for revenue calculation
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('purchases')
      .select('amount_paid, picks_count')
      .eq('status', 'completed');
    
    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError.message);
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }
    
    // Get pool status (simplified for now)
    const poolStatus = {
      isLocked: false,
      lockDate: null,
      timeUntilLock: null
    };
    
    console.log('✅ Admin settings API: Success for user:', authenticatedUser.email);
    return NextResponse.json({
      settings: settings || [],
      purchases: purchases || [],
      poolStatus,
      success: true
    });
    
  } catch (error) {
    console.error('Admin settings API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}