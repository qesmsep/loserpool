import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [TEST-ENDPOINT] Testing password reset system configuration')
  
  try {
    console.log('🔗 [TEST-ENDPOINT] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Test the Supabase connection
    console.log('🔗 [TEST-ENDPOINT] Testing Supabase connection...')
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1
    })

    if (error) {
      console.error('❌ [TEST-ENDPOINT] Supabase connection failed:', error)
      return NextResponse.json({ 
        status: 'error', 
        message: 'Supabase connection failed', 
        error: error.message 
      }, { status: 500 })
    }

    console.log('✅ [TEST-ENDPOINT] Supabase connection successful')
    
    const environment = {
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://loserpool.app',
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      resendKeyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0
    }
    
    console.log('✅ [TEST-ENDPOINT] Environment check:', environment)

    return NextResponse.json({ 
      status: 'success', 
      message: 'Password reset system is ready',
      supabase: 'connected',
      environment
    })

  } catch (error) {
    console.error('❌ [TEST-ENDPOINT] Test failed:', error)
    return NextResponse.json({ 
      status: 'error', 
      message: 'Test failed', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
