import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    console.log('=== CHECKING ADMIN USERS IN DATABASE ===')
    
    // Get all users to see what's in the database
    const { data: allUsers, error: allUsersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_admin, created_at')
      .order('created_at', { ascending: false })

    if (allUsersError) {
      console.error('Error fetching all users:', allUsersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get admin users specifically
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_admin, created_at')
      .eq('is_admin', true)
      .order('created_at', { ascending: false })

    if (adminError) {
      console.error('Error fetching admin users:', adminError)
      return NextResponse.json({ error: 'Failed to fetch admin users' }, { status: 500 })
    }

    console.log(`Total users in database: ${allUsers?.length || 0}`)
    console.log(`Admin users in database: ${adminUsers?.length || 0}`)

    return NextResponse.json({
      message: 'Admin users check completed',
      totalUsers: allUsers?.length || 0,
      adminUsers: adminUsers?.length || 0,
      allUsers: allUsers || [],
      adminUsersList: adminUsers || [],
      summary: {
        totalUsers: allUsers?.length || 0,
        adminUsers: adminUsers?.length || 0,
        nonAdminUsers: (allUsers?.length || 0) - (adminUsers?.length || 0)
      }
    })

  } catch (error) {
    console.error('Error checking admin users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
