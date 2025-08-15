import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getEmailConfigStatus, sendEmail } from '@/lib/email-service'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get email configuration status
    const configStatus = getEmailConfigStatus()
    
    // Get environment variables (without exposing sensitive data)
    const envInfo = {
      EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'not set',
      FROM_EMAIL: process.env.FROM_EMAIL || 'not set',
      HAS_EMAIL_API_KEY: !!process.env.EMAIL_API_KEY,
      HAS_SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'not set'
    }

    return NextResponse.json({
      success: true,
      configStatus,
      envInfo,
      message: 'Email configuration debug info'
    })

  } catch (error) {
    console.error('Error in email debug endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { testEmail } = body

    if (!testEmail) {
      return NextResponse.json({ error: 'testEmail parameter required' }, { status: 400 })
    }

    // Send a test email
    const result = await sendEmail({
      to: testEmail,
      subject: '🧪 Email Service Test - The Loser Pool',
      html: `
        <h2>Email Service Test</h2>
        <p>This is a test email to verify the email service is working correctly.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p><strong>Provider:</strong> ${getEmailConfigStatus().provider}</p>
        <hr>
        <p><em>If you received this email, the email service is working!</em></p>
      `,
      text: `
Email Service Test

This is a test email to verify the email service is working correctly.

Timestamp: ${new Date().toISOString()}
Provider: ${getEmailConfigStatus().provider}

If you received this email, the email service is working!
      `
    })

    return NextResponse.json({
      success: result.success,
      message: result.message,
      provider: result.provider,
      emailId: result.emailId,
      error: result.error
    })

  } catch (error) {
    console.error('Error in email test endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
