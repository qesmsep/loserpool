import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendSignupConfirmationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: userId and email' },
        { status: 400 }
      )
    }

    // Get the current Supabase client
    const supabase = await createServerSupabaseClient()

    // Generate a confirmation link using Supabase's built-in method
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)
    
    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // For signup confirmation, we'll use a different approach
    // Since we can't generate a signup link without the password,
    // we'll create a custom confirmation URL that the user can use
    // The actual confirmation will be handled by Supabase's built-in system
    
    const confirmationLink = `${process.env.NEXT_PUBLIC_APP_URL}/confirm-email?email=${encodeURIComponent(email)}`

    // Send the custom signup confirmation email
    const success = await sendSignupConfirmationEmail(userId, confirmationLink)

    if (success) {
      console.log(`✅ Custom signup confirmation email sent to ${email}`)
      return NextResponse.json({ 
        success: true, 
        message: 'Signup confirmation email sent successfully' 
      })
    } else {
      console.error(`❌ Failed to send custom signup confirmation email to ${email}`)
      return NextResponse.json(
        { error: 'Failed to send signup confirmation email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error in send-signup-email route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
