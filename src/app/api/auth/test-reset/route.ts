import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Test API route called')
    
    // Check environment variables
    const envCheck = {
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
    
    console.log('🔍 Environment check:', envCheck)
    
    return NextResponse.json({ 
      success: true,
      message: 'Test API route working',
      envCheck
    })
  } catch (error) {
    console.error('❌ Test API error:', error)
    return NextResponse.json({ error: 'Test failed' }, { status: 500 })
  }
}
