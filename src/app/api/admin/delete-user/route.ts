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

    // Create service role client for admin operations
    if (!supabaseServiceKey) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // First, get user info for logging
    const { data: userInfo, error: userInfoError } = await supabaseAdmin
      .from('users')
      .select('email, username, first_name, last_name, is_admin')
      .eq('id', userId)
      .single()

    if (userInfoError) {
      console.error('❌ Error fetching user info:', userInfoError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('👤 Deleting user:', userInfo?.email || userId)
    console.log('👤 User is admin:', userInfo?.is_admin)

    // Prevent deleting the last admin user
    if (userInfo?.is_admin) {
      const { count: adminCount } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_admin', true)

      if (adminCount === 1) {
        return NextResponse.json({ 
          error: 'Cannot delete the last admin user. Please create another admin first.' 
        }, { status: 400 })
      }
    }

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

    // Check for other related tables
    const { count: invitationsCount } = await supabaseAdmin
      .from('invitations')
      .select('*', { count: 'exact', head: true })
      .or(`created_by.eq.${userId},used_by.eq.${userId}`)

    console.log('📊 Related records to be deleted:')
    console.log('  - Picks:', picksCount || 0)
    console.log('  - Purchases:', purchasesCount || 0)
    console.log('  - Weekly Results:', weeklyResultsCount || 0)
    console.log('  - Invitations:', invitationsCount || 0)

    // Start transaction-like deletion process
    console.log('🗑️ Starting deletion process...')

    // 1. Delete from public.users first (this should cascade to related records)
    console.log('🗑️ Deleting from public.users (with cascade)...')
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Profile delete error:', profileError)
      
      // If cascade delete failed, try manual deletion of related records
      console.log('🔄 Cascade delete failed, trying manual deletion...')
      
      // Delete picks
      const { error: picksError } = await supabaseAdmin
        .from('picks')
        .delete()
        .eq('user_id', userId)
      
      if (picksError) console.error('❌ Picks delete error:', picksError)
      else console.log('✅ Picks deleted manually')

      // Delete purchases
      const { error: purchasesError } = await supabaseAdmin
        .from('purchases')
        .delete()
        .eq('user_id', userId)
      
      if (purchasesError) console.error('❌ Purchases delete error:', purchasesError)
      else console.log('✅ Purchases deleted manually')

      // Delete weekly results
      const { error: weeklyError } = await supabaseAdmin
        .from('weekly_results')
        .delete()
        .eq('user_id', userId)
      
      if (weeklyError) console.error('❌ Weekly results delete error:', weeklyError)
      else console.log('✅ Weekly results deleted manually')

      // Try deleting user profile again
      const { error: retryError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId)

      if (retryError) {
        console.error('❌ Final profile delete error:', retryError)
        return NextResponse.json({ 
          error: `Failed to delete user profile: ${retryError.message}` 
        }, { status: 500 })
      }
    }

    // 2. Delete from auth.users using service role
    console.log('🗑️ Deleting from auth.users...')
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      console.error('❌ Auth delete error:', authError)
      console.log('⚠️ Auth user deletion failed, but profile was deleted successfully')
      return NextResponse.json({ 
        message: 'User profile deleted successfully, but auth user deletion failed. You may need to delete the auth user manually.',
        warning: 'Auth user deletion failed',
        deletedRecords: {
          picks: picksCount || 0,
          purchases: purchasesCount || 0,
          weeklyResults: weeklyResultsCount || 0,
          invitations: invitationsCount || 0
        }
      })
    }

    console.log('✅ User and all related data deleted successfully')
    return NextResponse.json({ 
      message: 'User and all related data deleted successfully',
      deletedRecords: {
        picks: picksCount || 0,
        purchases: purchasesCount || 0,
        weeklyResults: weeklyResultsCount || 0,
        invitations: invitationsCount || 0
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