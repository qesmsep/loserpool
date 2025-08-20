import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    await requireAdmin()
    
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('🔄 Starting comprehensive user deletion for:', userId)

    // Try service role approach first
    if (supabaseServiceKey) {
      try {
        // Create service role client for admin operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // First, get user info for logging
        const { data: userInfo } = await supabaseAdmin
          .from('users')
          .select('email, username, first_name, last_name')
          .eq('id', userId)
          .single()

        console.log('👤 Deleting user:', userInfo?.email || userId)

        // Count related records before deletion for logging
        const { count: picksCount } = await supabaseAdmin
          .from('picks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const { count: purchasesCount } = await supabaseAdmin
          .from('purchases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        const { count: weeklyResultsCount } = await supabaseAdmin
          .from('weekly_results')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)

        console.log('📊 Related records to be deleted:')
        console.log('  - Picks:', picksCount || 0)
        console.log('  - Purchases:', purchasesCount || 0)
        console.log('  - Weekly Results:', weeklyResultsCount || 0)

        // Delete from auth.users using service role
        console.log('🗑️ Deleting from auth.users...')
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
          console.error('❌ Auth delete error:', authError)
          // If auth delete fails, we'll still try to delete the profile
        } else {
          console.log('✅ Auth user deleted successfully')
        }

        // Delete from public.users (this should cascade to related records)
        console.log('🗑️ Deleting from public.users (with cascade)...')
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId)

        if (profileError) {
          console.error('❌ Profile delete error:', profileError)
          throw profileError
        }

        console.log('✅ User profile and all related records deleted successfully')
        return NextResponse.json({ 
          message: 'User and all related data deleted successfully',
          deletedRecords: {
            picks: picksCount || 0,
            purchases: purchasesCount || 0,
            weeklyResults: weeklyResultsCount || 0
          }
        })
      } catch (serviceRoleError) {
        console.error('❌ Service role approach failed:', serviceRoleError)
        // Fall back to manual approach
      }
    }

    // Fallback: Try to delete profile only (cascade will handle related records)
    console.log('⚠️ Using fallback approach - deleting profile only')
    const { createServerSupabaseClient } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabaseClient()
    
    // Count related records before deletion for logging
    const { count: picksCount } = await supabase
      .from('picks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { count: purchasesCount } = await supabase
      .from('purchases')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    console.log('📊 Related records that will be cascaded:')
    console.log('  - Picks:', picksCount || 0)
    console.log('  - Purchases:', purchasesCount || 0)
    
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Profile deletion error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    console.log('✅ User profile deleted successfully (fallback)')
    return NextResponse.json({ 
      message: 'User profile and related records deleted. Note: Auth user may need to be deleted separately.',
      deletedRecords: {
        picks: picksCount || 0,
        purchases: purchasesCount || 0
      }
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 