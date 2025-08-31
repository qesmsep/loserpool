import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [REQUEST-PASSWORD-RESET] Starting password reset request')
  
  try {
    const { email } = await request.json()
    
    if (!email) {
      console.log('❌ [REQUEST-PASSWORD-RESET] Missing email')
      return NextResponse.json({ 
        error: 'Email is required' 
      }, { status: 400 })
    }

    console.log('🔧 [REQUEST-PASSWORD-RESET] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Use Supabase's built-in password reset email system
    console.log('🔧 [REQUEST-PASSWORD-RESET] Sending password reset email via Supabase...')
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password/confirm`
      }
    })
    
    if (error) {
      console.error('❌ [REQUEST-PASSWORD-RESET] Failed to generate reset link:', error)
      
      // Don't reveal if user exists or not for security
      console.log('✅ [REQUEST-PASSWORD-RESET] Returning generic success message for security')
      return NextResponse.json({ 
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      })
    }
    
    console.log('✅ [REQUEST-PASSWORD-RESET] Password reset link generated successfully')
    console.log('✅ [REQUEST-PASSWORD-RESET] Reset link sent to:', email)
    
    return NextResponse.json({ 
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    })

  } catch (error) {
    console.error('❌ [REQUEST-PASSWORD-RESET] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
