import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json()
    
    if (!token || !newPassword) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Validate the token
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Token has expired' }, { status: 400 })
    }

    // Get user from public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('id', tokenData.user_id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    console.log('🔍 Processing password reset for user:', userData.email)

    // Try to find the user in auth.users by email
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('Error listing auth users:', listError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    let authUser = authUsers.users.find(user => user.email === userData.email)
    
    if (!authUser) {
      console.log('User not found in auth.users, attempting to create:', userData.email)
      
      try {
        // Try to create the user in auth.users
        const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: newPassword,
          email_confirm: true
        })

        if (createError) {
          console.error('Error creating auth user:', createError)
          
          // If creation fails, try to use Supabase's built-in password reset
          console.log('Attempting fallback to Supabase built-in reset...')
          const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(userData.email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.vercel.app'}/reset-password/confirm`
          })

          if (resetError) {
            console.error('Fallback reset also failed:', resetError)
            return NextResponse.json({ 
              error: 'Unable to reset password. Please contact support.',
              details: 'User account exists but cannot be updated automatically.'
            }, { status: 500 })
          }

          // Mark token as used since we sent a reset email
          await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used: true })
            .eq('token', token)

          return NextResponse.json({ 
            success: true,
            message: 'A password reset link has been sent to your email. Please check your inbox and use the link to reset your password.'
          })
        }

        authUser = newAuthUser.user
        console.log('✅ Created new auth user:', authUser.id)
      } catch (createError) {
        console.error('Unexpected error creating auth user:', createError)
        return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
      }
    } else {
      console.log('Found existing auth user, updating password:', authUser.id)
      
      // Update the existing user's password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('Error updating password:', updateError)
        return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
      }
    }

    // Mark the token as used
    const { error: markUsedError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token)

    if (markUsedError) {
      console.error('Error marking token as used:', markUsedError)
      // Don't fail the request if we can't mark the token as used
    }

    console.log('✅ Password updated successfully for user:', userData.email)

    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
