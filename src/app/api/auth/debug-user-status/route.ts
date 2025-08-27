import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Check auth.users
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Auth users error:', authError)
      return NextResponse.json({ error: 'Failed to check auth users' }, { status: 500 })
    }

    const authUser = authUsers.users.find(user => user.email === email)

    // Check public.users
    const { data: publicUsers, error: publicError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)

    if (publicError) {
      console.error('Public users error:', publicError)
      return NextResponse.json({ error: 'Failed to check public users' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      email,
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        emailConfirmed: authUser.email_confirmed_at,
        createdAt: authUser.created_at,
        lastSignIn: authUser.last_sign_in_at
      } : null,
      publicUser: publicUsers?.[0] || null,
      summary: {
        inAuthUsers: !!authUser,
        inPublicUsers: publicUsers && publicUsers.length > 0,
        publicUserCount: publicUsers?.length || 0
      }
    })

  } catch (error) {
    console.error('Debug user status error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}
