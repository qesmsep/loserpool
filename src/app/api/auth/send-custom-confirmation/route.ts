import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const supabase = await createServerSupabaseClient()
    
    // Generate a custom confirmation token
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Send custom email with the confirmation link
    const confirmationLink = data.properties.action_link
    const emailBody = `
      Welcome to The Loser Pool!
      
      Please confirm your email by clicking this link:
      ${confirmationLink}
      
      This link will redirect you to: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard
    `

    console.log('Custom confirmation email:', {
      to: email,
      link: confirmationLink,
      redirectTo: process.env.NEXT_PUBLIC_APP_URL
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Custom confirmation email sent',
      redirectTo: process.env.NEXT_PUBLIC_APP_URL
    })

  } catch (error) {
    console.error('Custom confirmation error:', error)
    return NextResponse.json({ error: 'Failed to send confirmation' }, { status: 500 })
  }
}
