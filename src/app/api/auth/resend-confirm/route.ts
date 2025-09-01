import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Generate a new confirmation (signup) email for an existing user
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      password: 'temporary_password_for_confirmation', // Required for signup links
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      }
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (e) {
    return NextResponse.json({ 
      success: false, 
      error: e instanceof Error ? e.message : 'Unknown error' 
    }, { status: 500 })
  }
}
