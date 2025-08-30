import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabaseAdmin = createServiceRoleClient()

    // List all auth users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error listing auth users:', error)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }

    // Return user list (without sensitive data)
    const safeUsers = users.users.map(user => ({
      id: user.id,
      email: user.email,
      email_confirmed_at: user.email_confirmed_at,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at
    }))

    return NextResponse.json({ 
      users: safeUsers,
      total: safeUsers.length
    })

  } catch (error) {
    console.error('Debug auth users error:', error)
    return NextResponse.json({ 
      error: 'Failed to get auth users',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
