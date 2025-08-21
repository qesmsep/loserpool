import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()
    
    const { userIds, newType } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required' },
        { status: 400 }
      )
    }

    if (!newType || !['registered', 'active', 'tester', 'eliminated', 'pending'].includes(newType)) {
      return NextResponse.json(
        { error: 'Valid user type is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()

    // Update all users in the array
    const { data, error } = await supabase
      .from('users')
      .update({ user_type: newType })
      .in('id', userIds)
      .select('id, email, user_type')

    if (error) {
      console.error('Error updating user types:', error)
      return NextResponse.json(
        { error: 'Failed to update user types' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      updatedUsers: data,
      message: `Updated ${data.length} users to ${newType}`
    })

  } catch (error) {
    console.error('Error in update user types API:', error)
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
