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

    // Check if user exists in public.users
    const { data: publicUser, error: publicError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single()

    if (publicError || !publicUser) {
      return NextResponse.json({ 
        error: 'User not found in public.users',
        publicError: publicError?.message 
      }, { status: 404 })
    }

    console.log('✅ Found in public.users:', publicUser)

    // Check if user exists in auth.users
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json({ 
        error: 'Failed to list auth users',
        listError: listError.message 
      }, { status: 500 })
    }

    const authUser = authUsers.users.find(user => user.email === email)
    
    if (!authUser) {
      return NextResponse.json({ 
        error: 'User not found in auth.users',
        publicUser: publicUser,
        authUsersCount: authUsers.users.length
      }, { status: 404 })
    }

    console.log('✅ Found in auth.users:', {
      id: authUser.id,
      email: authUser.email,
      created_at: authUser.created_at,
      updated_at: authUser.updated_at
    })

    // Try to update the password with a test password
    const testPassword = 'TestPassword123!'
    
    const { data: updateResult, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: testPassword }
    )

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update password',
        updateError: updateError.message,
        authUser: {
          id: authUser.id,
          email: authUser.email
        }
      }, { status: 500 })
    }

    console.log('✅ Password update result:', {
      userId: updateResult.user?.id,
      email: updateResult.user?.email,
      updatedAt: updateResult.user?.updated_at
    })

    // Verify the update by getting the user again
    const { data: verifyUser, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(authUser.id)
    
    if (verifyError) {
      return NextResponse.json({ 
        error: 'Failed to verify password update',
        verifyError: verifyError.message
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Password reset debug completed',
      publicUser: publicUser,
      authUser: {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at,
        updated_at: authUser.updated_at
      },
      updateResult: {
        userId: updateResult.user?.id,
        email: updateResult.user?.email,
        updatedAt: updateResult.user?.updated_at
      },
      verifyUser: {
        id: verifyUser.user?.id,
        email: verifyUser.user?.email,
        updatedAt: verifyUser.user?.updated_at
      },
      testPassword: testPassword,
      note: 'Check the server logs for detailed information'
    })

  } catch (error) {
    console.error('Debug password reset error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
