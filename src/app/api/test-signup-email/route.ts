import { NextRequest, NextResponse } from 'next/server'
import { sendSignupConfirmationEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const { userId, email, confirmationLink } = await request.json()

    if (!userId || !email || !confirmationLink) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, and confirmationLink' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing signup confirmation email...')
    console.log('📧 To:', email)
    console.log('🔗 Confirmation Link:', confirmationLink)

    // Send the custom signup confirmation email
    const success = await sendSignupConfirmationEmail(userId, confirmationLink)

    if (success) {
      console.log('✅ Test signup confirmation email sent successfully')
      return NextResponse.json({ 
        success: true, 
        message: 'Test signup confirmation email sent successfully',
        details: {
          userId,
          email,
          confirmationLink: confirmationLink.substring(0, 50) + '...'
        }
      })
    } else {
      console.error('❌ Failed to send test signup confirmation email')
      return NextResponse.json(
        { error: 'Failed to send test signup confirmation email' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('❌ Error in test-signup-email route:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Test signup email endpoint',
    usage: 'POST with { userId, email, confirmationLink }',
    example: {
      userId: 'user-uuid',
      email: 'test@example.com',
      confirmationLink: 'https://your-app.com/confirm?token=...'
    }
  })
}
