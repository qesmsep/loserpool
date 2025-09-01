import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

type Payload = 
  | { email: string; newPassword: string }
  | { userId: string; newPassword: string }

export async function POST(request: Request) {
  console.log('🔧 [UPDATE-PASSWORD-DIRECT] via RPC')

  try {
    const body = (await request.json()) as Payload
    const { newPassword } = body

    if (!newPassword) {
      return NextResponse.json({ success: false, error: 'newPassword is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Prefer userId over email
    const rpcArgs: Record<string, string | null> = { p_new_password: newPassword }
    
    if ('userId' in body && body.userId) {
      rpcArgs.p_user_id = body.userId
    } else if ('email' in body && body.email) {
      rpcArgs.p_email = body.email
    } else {
      return NextResponse.json({ success: false, error: 'email or userId is required' }, { status: 400 })
    }

    console.log('🔧 [UPDATE-PASSWORD-DIRECT] (RPC) Calling public.lp_admin_set_password', { 
      has_user_id: !!rpcArgs.p_user_id, 
      has_email: !!rpcArgs.p_email 
    })

    const { error: rpcError } = await supabaseAdmin.rpc('lp_admin_set_password', rpcArgs)

    if (rpcError) {
      console.error('❌ [UPDATE-PASSWORD-DIRECT] (RPC) Password update failed:', rpcError)
      return NextResponse.json({ 
        success: false, 
        error: 'Password update failed', 
        details: rpcError.message 
      }, { status: 500 })
    }

    console.log('✓ [UPDATE-PASSWORD-DIRECT] (RPC) Password updated successfully via SQL')
    return NextResponse.json({ success: true, message: 'Password updated successfully (SQL)' })

  } catch (e) {
    console.error('❌ [UPDATE-PASSWORD-DIRECT] (RPC) Unexpected error:', e)
    return NextResponse.json({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Unknown error' 
    }, { status: 500 })
  }
}
