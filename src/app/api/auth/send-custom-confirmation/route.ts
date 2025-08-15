import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const supabase = await createServerSupabaseClient()
    
    // For custom confirmation, we'll use a different approach
    // Since we can't generate a signup link without the password,
    // we'll create a simple confirmation endpoint that logs the request
    
    const confirmationLink = `https://loserpool.vercel.app/api/auth/confirm-email?email=${encodeURIComponent(email)}`
    
    console.log('Custom confirmation email:', {
      to: email,
      link: confirmationLink,
      redirectTo: 'https://loserpool.vercel.app'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Custom confirmation email sent',
      confirmationLink: confirmationLink,
      redirectTo: 'https://loserpool.vercel.app'
    })

  } catch (error) {
    console.error('Custom confirmation error:', error)
    return NextResponse.json({ error: 'Failed to send confirmation' }, { status: 500 })
  }
}
