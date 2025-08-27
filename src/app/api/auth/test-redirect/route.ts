import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Test the redirect URL that would be used
    const testEmail = 'test@example.com'
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.vercel.app'}/reset-password/confirm`
    
    console.log('🔍 Testing redirect URL:', redirectUrl)
    console.log('🔍 NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL)
    
    return NextResponse.json({ 
      success: true,
      redirectUrl: redirectUrl,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      fallbackUrl: 'https://loserpool.vercel.app/reset-password/confirm',
      note: 'Check your Supabase Auth settings to ensure this redirect URL is allowed'
    })

  } catch (error) {
    console.error('Test redirect error:', error)
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}
