import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, user_type, is_admin')

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    const results = []
    
    // Update user types for each user
    for (const user of users || []) {
      try {
        // Skip testers
        if (user.is_admin || user.user_type === 'tester') {
          results.push({
            userId: user.id,
            oldType: user.user_type,
            newType: user.user_type,
            status: 'skipped (tester)'
          })
          continue
        }

        // Get current picks for this user
        const { data: picks } = await supabase
          .from('picks')
          .select('status')
          .eq('user_id', user.id)

        // Get completed purchases for this user
        const { data: purchases } = await supabase
          .from('purchases')
          .select('id')
          .eq('user_id', user.id)
          .eq('status', 'completed')

        let newType = user.user_type

        if (!picks || picks.length === 0) {
          // No picks - should be 'registered' if no purchases, 'active' if has purchases
          newType = purchases && purchases.length > 0 ? 'active' : 'registered'
        } else {
          // Has picks - check if any are active
          const hasActivePicks = picks.some(pick => pick.status === 'active')
          
          if (hasActivePicks) {
            // Has active picks - user is active
            newType = 'active'
          } else {
            // Has picks but none are active - user is eliminated
            newType = 'eliminated'
          }
        }

        // Update user type if it changed
        if (newType !== user.user_type) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ user_type: newType })
            .eq('id', user.id)

          if (updateError) {
            results.push({
              userId: user.id,
              oldType: user.user_type,
              newType: newType,
              status: 'error',
              error: updateError.message
            })
          } else {
            results.push({
              userId: user.id,
              oldType: user.user_type,
              newType: newType,
              status: 'updated'
            })
          }
        } else {
          results.push({
            userId: user.id,
            oldType: user.user_type,
            newType: newType,
            status: 'no change needed'
          })
        }
      } catch (error) {
        results.push({
          userId: user.id,
          oldType: user.user_type,
          newType: 'unknown',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Get summary statistics
    const summary = {
      total: results.length,
      updated: results.filter(r => r.status === 'updated').length,
      skipped: results.filter(r => r.status === 'skipped (tester)').length,
      noChange: results.filter(r => r.status === 'no change needed').length,
      errors: results.filter(r => r.status === 'error').length
    }

    return NextResponse.json({
      message: 'User types updated successfully',
      summary,
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating user types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get user type summary
    const { data: userTypes, error: userTypesError } = await supabase
      .from('users')
      .select('user_type, is_admin')
      .order('user_type')

    if (userTypesError) {
      console.error('Error fetching user types:', userTypesError)
      return NextResponse.json(
        { error: 'Failed to fetch user types' },
        { status: 500 }
      )
    }

    // Count users by type
    const typeCounts = userTypes?.reduce((acc, user) => {
      const type = user.is_admin ? 'tester' : user.user_type
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get users who might need type updates
    const { data: usersNeedingUpdates } = await supabase
      .from('users')
      .select(`
        id,
        email,
        user_type,
        is_admin,
        picks!inner(status)
      `)
      .not('is_admin', 'eq', true)
      .not('user_type', 'eq', 'tester')

    const usersToUpdate = usersNeedingUpdates?.map(user => {
      const hasActivePicks = user.picks.some((pick: { status: string }) => pick.status === 'active')
      const hasAnyPicks = user.picks.length > 0
      
      let suggestedType = user.user_type
      if (!hasAnyPicks) {
        suggestedType = 'registered' // Assuming they have no purchases
      } else if (hasActivePicks) {
        suggestedType = 'active'
      } else {
        suggestedType = 'eliminated'
      }

      return {
        id: user.id,
        email: user.email,
        currentType: user.user_type,
        suggestedType,
        needsUpdate: suggestedType !== user.user_type,
        activePicks: user.picks.filter((pick: { status: string }) => pick.status === 'active').length,
        totalPicks: user.picks.length
      }
    }) || []

    const needsUpdate = usersToUpdate.filter(u => u.needsUpdate)

    return NextResponse.json({
      message: 'User type analysis',
      typeCounts,
      totalUsers: userTypes?.length || 0,
      usersNeedingUpdates: needsUpdate.length,
      usersToUpdate: needsUpdate.slice(0, 10), // Show first 10
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error analyzing user types:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
