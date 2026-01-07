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
      }
    }
    
    // Fall back to cookie-based authentication
    if (!authenticatedUser) {
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
        }
      } catch (error) {
        console.error('Cookie authentication error:', error);
      }
    }
    
    // If no authenticated user, return 401
    if (!authenticatedUser) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin using service role client
    const supabaseAdmin = createServiceRoleClient();
    const { data: userProfile, error: adminError } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', authenticatedUser.id)
      .single();
    
    if (adminError) {
      console.error('Admin check error:', adminError.message);
      return NextResponse.json({ error: 'Admin verification failed' }, { status: 403 });
    }
    
    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get all purchases with user data using service role client
    const { data: purchases, error: purchasesError } = await supabaseAdmin
      .from('purchases')
      .select(`
        *,
        users!inner(
          username,
          email,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (purchasesError) {
      console.error('Error fetching purchases:', purchasesError.message);
      return NextResponse.json({ error: 'Failed to fetch purchases' }, { status: 500 });
    }
    
    return NextResponse.json({
      purchases: purchases || [],
      success: true
    });
    
  } catch (error) {
    console.error('Admin purchases API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
