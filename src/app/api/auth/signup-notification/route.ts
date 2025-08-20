import { NextRequest, NextResponse } from 'next/server'
import { sendAdminSignupNotification } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { userEmail, username, firstName, lastName, signupId } = await request.json()

    // Send admin notification for new user signup
    await sendAdminSignupNotification({
      userEmail,
      username,
      firstName,
      lastName,
      signupTime: new Date().toLocaleString(),
      signupId
    })

    console.log('✅ Admin notification sent for new user signup')
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error sending admin notification for signup:', error)
    return NextResponse.json({ error: 'Failed to send admin notification' }, { status: 500 })
  }
}
