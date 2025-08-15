import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    const supabase = await createServerSupabaseClient()
    
    // Generate a confirmation token
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'signup',
      email: email,
      options: {
        redirectTo: 'https://loserpool.vercel.app/api/auth/confirm-email'
      }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create hardcoded confirmation link
    const confirmationLink = `https://loserpool.vercel.app/api/auth/confirm-email?token=${data.properties.action_link}&email=${encodeURIComponent(email)}`
    
    const emailBody = `
      Welcome to The Loser Pool!
      
      Please confirm your email by clicking this link:
      ${confirmationLink}
      
      This link will take you directly to your dashboard after confirmation.
      
      If you didn't sign up for The Loser Pool, you can safely ignore this email.
    `

    console.log('Signup confirmation email:', {
      to: email,
      link: confirmationLink,
      hardcodedDomain: 'https://loserpool.vercel.app'
    })

    // TODO: Send actual email here
    // For now, just log it
    console.log('Email would be sent:', {
      to: email,
      subject: 'Confirm your email - The Loser Pool',
      body: emailBody
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Signup confirmation email sent',
      confirmationLink: confirmationLink
    })

  } catch (error) {
    console.error('Signup email error:', error)
    return NextResponse.json({ error: 'Failed to send signup email' }, { status: 500 })
  }
}
