import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { isUserTester, updateUserTypeBasedOnPicks } from '@/lib/user-types'

export async function POST(request: NextRequest) {
  try {
    // Handle authentication - try bearer token first, then cookies
    let authenticatedUser = null;
    
    // Check for bearer token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log('🔍 Admin add-picks API: Using bearer token authentication');
      
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
      console.log('🔍 Admin add-picks API: Falling back to cookie authentication');
      
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
      console.log('❌ No authenticated user found for admin add-picks API');
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
    
    console.log('✅ User is admin, proceeding with add picks operation');
    
    const { userId, picksCount } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!picksCount || picksCount <= 0) {
      return NextResponse.json({ error: 'Valid picks count is required' }, { status: 400 })
    }

    console.log('Adding picks:', { userId, picksCount })

    // Use service role client for admin operations

    // Check if user is a tester to determine price
    const userIsTester = await isUserTester(userId)
    const amountPerPick = userIsTester ? 0 : 2100 // $0 for testers, $21 for others (in cents)
    const totalAmount = picksCount * amountPerPick

    console.log('User tester status:', { userId, userIsTester, amountPerPick, totalAmount })

    // Add purchase record
    const { data: purchaseData, error: purchaseError } = await supabaseAdmin
      .from('purchases')
      .insert({
        user_id: userId,
        picks_count: picksCount,
        amount_paid: totalAmount,
        status: 'completed'
      })
      .select()

    if (purchaseError) {
      console.error('Error adding purchase:', purchaseError)
      return NextResponse.json({ error: purchaseError.message }, { status: 400 })
    }

    // Get existing picks to determine the next sequential number
    const { data: existingPicks } = await supabaseAdmin
      .from('picks')
      .select('pick_name')
      .eq('user_id', userId)
      .not('pick_name', 'is', null)

    // Find the highest existing pick number
    let nextPickNumber = 1
    if (existingPicks && existingPicks.length > 0) {
      const pickNumbers = existingPicks
        .map(pick => {
          const match = pick.pick_name?.match(/^Pick (\d+)$/)
          return match ? parseInt(match[1]) : 0
        })
        .filter(num => num > 0)
      
      if (pickNumbers.length > 0) {
        nextPickNumber = Math.max(...pickNumbers) + 1
      }
    }

    // Create actual pick records in the picks table with sequential names
    const pickRecords = []
    for (let i = 0; i < picksCount; i++) {
      pickRecords.push({
        user_id: userId,
        picks_count: 1,
        status: 'pending',
        pick_name: `Pick ${nextPickNumber + i}`
      })
    }

    const { data: picksData, error: picksError } = await supabaseAdmin
      .from('picks')
      .insert(pickRecords)
      .select()

    if (picksError) {
      console.error('Error creating pick records:', picksError)
      return NextResponse.json({ error: picksError.message }, { status: 400 })
    }

    // Update user type based on picks status
    try {
      await updateUserTypeBasedOnPicks(userId)
    } catch (error) {
      console.error('Error updating user type:', error)
      // Don't fail the request if user type update fails
    }

    const priceMessage = userIsTester ? 'free' : `$${(totalAmount / 100).toFixed(2)}`
    console.log('Picks added successfully:', { purchase: purchaseData[0], picks: picksData, priceMessage })
    return NextResponse.json({ 
      message: `${picksCount} picks added successfully for ${priceMessage}`,
      purchase: purchaseData[0],
      picks: picksData,
      userIsTester,
      totalAmount
    })
  } catch (error) {
    console.error('Add picks error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 