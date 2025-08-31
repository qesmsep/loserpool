import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  console.log('🔧 [CHECK-SUPABASE-CONFIG] Starting Supabase configuration check')
  
  try {
    const supabaseAdmin = createServiceRoleClient()
    
    // Test basic connectivity
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1
    })

    if (listError) {
      console.error('❌ [CHECK-SUPABASE-CONFIG] Failed to list users:', listError)
      return NextResponse.json({ 
        error: 'Failed to connect to Supabase',
        details: listError.message 
      }, { status: 500 })
    }

    // Check environment variables
    const config = {
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.length : 0,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      anonKeyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length : 0,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasResendKey: !!process.env.RESEND_API_KEY,
      resendKeyLength: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.length : 0
    }

    console.log('✅ [CHECK-SUPABASE-CONFIG] Configuration check complete')
    
    return NextResponse.json({ 
      success: true,
      message: 'Supabase connection successful',
      config,
      canConnect: true
    })

  } catch (error) {
    console.error('❌ [CHECK-SUPABASE-CONFIG] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
