import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Check if token exists and is valid
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid or expired reset token' 
      })
    }

    // Check if token has expired
    const now = new Date()
    const expiresAt = new Date(tokenData.expires_at)
    
    if (now > expiresAt) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Reset token has expired' 
      })
    }

    // Get user information
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.getUserById(tokenData.user_id)
    
    if (userError || !user.user) {
      return NextResponse.json({ 
        valid: false, 
        error: 'User not found' 
      })
    }

    return NextResponse.json({ 
      valid: true,
      user: {
        id: user.user.id,
        email: user.user.email
      },
      token: tokenData.token
    })

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json({ 
      valid: false, 
      error: 'Failed to validate token' 
    })
  }
}
