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
      return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json({ error: 'Reset token has expired' }, { status: 400 })
    }

    // Get the user's email from the public.users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', tokenData.user_id)
      .single()

    if (userError || !userData) {
      console.error('Error getting user email:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use Supabase Auth's built-in password reset flow
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      
      // If the admin API fails, try using the regular auth flow
      // This might work better for users that exist in public.users but not auth.users
      try {
        // Create a temporary session and update password
        const { error: tempError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: userData.email,
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/reset-password/confirm`
          }
        })
        
        if (tempError) {
          console.error('Error generating recovery link:', tempError)
          return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
        }
        
        // For now, let's just mark the token as used and tell the user to use the email link
        await supabaseAdmin
          .from('password_reset_tokens')
          .update({ used: true })
          .eq('token', token)
        
        return NextResponse.json({ 
          success: true,
          message: 'Password reset link sent to your email. Please check your email and use the link to reset your password.'
        })
        
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError)
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

    console.log('✅ Password reset successful for user:', tokenData.user_id)

    return NextResponse.json({ 
      success: true,
      message: 'Password reset successfully'
    })

  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
