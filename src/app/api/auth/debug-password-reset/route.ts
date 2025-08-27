import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    console.log('🔍 Debug password reset for email:', email)

    // Check if user exists in public.users (get all matches)
    const { data: publicUsers, error: publicError } = await supabaseAdmin
      .from('users')
      .select('id, email, created_at, updated_at')
      .eq('email', email)

    if (publicError) {
      return NextResponse.json({ 
        error: 'Error querying public.users',
        publicError: publicError.message 
      }, { status: 500 })
    }

    if (!publicUsers || publicUsers.length === 0) {
      return NextResponse.json({ 
        error: 'User not found in public.users',
        email: email
      }, { status: 404 })
    }

    console.log('✅ Found in public.users:', publicUsers)

    // Check if user exists in auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json({ 
        error: 'Failed to list auth users',
        listError: listError.message 
      }, { status: 500 })
    }

    const matchingAuthUsers = authUsers.users.filter(user => user.email === email)
    
    console.log('✅ Found in auth.users:', matchingAuthUsers.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      updated_at: u.updated_at
    })))

    return NextResponse.json({ 
      success: true,
      message: 'Debug password reset analysis completed',
      email: email,
      publicUsers: publicUsers,
      authUsers: matchingAuthUsers.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        updated_at: u.updated_at
      })),
      summary: {
        publicUsersCount: publicUsers.length,
        authUsersCount: matchingAuthUsers.length,
        hasMultiplePublicUsers: publicUsers.length > 1,
        hasMultipleAuthUsers: matchingAuthUsers.length > 1,
        hasMatchingUsers: publicUsers.length > 0 && matchingAuthUsers.length > 0
      },
      note: 'Multiple users with the same email can cause password reset issues. Consider cleaning up duplicate accounts.'
    })

  } catch (error) {
    console.error('Debug password reset error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
