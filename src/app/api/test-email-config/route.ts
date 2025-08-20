import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const emailConfig = {
      provider: process.env.EMAIL_PROVIDER || 'console',
      fromEmail: process.env.FROM_EMAIL || 'noreply@loserpool.app',
      hasApiKey: !!(process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY),
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSendGridKey: !!process.env.SENDGRID_API_KEY,
      emailApiKey: process.env.EMAIL_API_KEY ? 'SET' : 'NOT SET',
      resendApiKey: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET'
    }

    console.log('📧 Email Configuration Debug:', emailConfig)

    return NextResponse.json({
      message: 'Email configuration check',
      config: emailConfig,
      recommendations: getRecommendations(emailConfig)
    })

  } catch (error) {
    console.error('Error checking email config:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getRecommendations(config: any) {
  const recommendations = []

  if (config.provider === 'console') {
    recommendations.push('⚠️ Email provider is set to "console" - emails are only logged, not sent')
    recommendations.push('💡 Set EMAIL_PROVIDER to "resend", "sendgrid", or "supabase" to send real emails')
  }

  if (config.provider === 'resend' && !config.hasResendKey) {
    recommendations.push('❌ EMAIL_PROVIDER is "resend" but RESEND_API_KEY is not set')
  }

  if (config.provider === 'sendgrid' && !config.hasSendGridKey) {
    recommendations.push('❌ EMAIL_PROVIDER is "sendgrid" but SENDGRID_API_KEY is not set')
  }

  if (config.provider === 'supabase' && (!config.hasSupabaseUrl || !config.hasSupabaseServiceKey)) {
    recommendations.push('❌ EMAIL_PROVIDER is "supabase" but Supabase configuration is missing')
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ Email configuration looks good!')
  }

  return recommendations
}
