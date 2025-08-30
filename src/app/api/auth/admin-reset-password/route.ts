import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()
    
    console.log('🔍 Admin password reset request for:', email)
    
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Find the user in auth.users table
    console.log('🔍 Finding user in auth.users...')
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing auth users:', listError)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }

    const authUser = users.users.find(u => u.email === email)
    
    if (authUser) {
      console.log('✅ User found in auth.users:', authUser.id)
      
      // Update the existing user's password
      console.log('🔄 Updating password for user:', authUser.id)
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('❌ Error updating password:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update password',
          details: updateError.message 
        }, { status: 500 })
      }

      console.log('✅ Password updated successfully for user:', email)
      return NextResponse.json({ 
        success: true,
        message: 'Password updated successfully'
      })
    } else {
      console.log('⚠️ User not found in auth.users, creating new user...')
      
      // Create the user in auth.users since they have a valid session
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true
      })

      if (createError) {
        console.error('❌ Error creating auth user:', createError)
        return NextResponse.json({ 
          error: 'Failed to create user account',
          details: createError.message 
        }, { status: 500 })
      }

      console.log('✅ New auth user created with password:', createData.user?.id)
      return NextResponse.json({ 
        success: true,
        message: 'User created with password successfully'
      })
    }

  } catch (error) {
    console.error('❌ Admin password reset error:', error)
    return NextResponse.json({ 
      error: 'Password reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
