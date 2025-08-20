import { NextRequest, NextResponse } from 'next/server'

// Import the sendEmail function directly for testing
async function sendEmailDirect(emailData: {
  to: string
  subject: string
  htmlBody: string
}) {
  const { Resend } = require('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  const { data, error } = await resend.emails.send({
    from: 'The Loser Pool <onboarding@resend.dev>',
    to: [emailData.to],
    subject: emailData.subject,
    html: emailData.htmlBody,
    text: emailData.htmlBody.replace(/<[^>]*>/g, '')
  })

  if (error) {
    console.error('❌ Direct email error:', error)
    throw error
  }

  console.log('✅ Direct email sent:', data)
  return data
}

export async function POST(request: NextRequest) {
  try {
    // Test signup data
    const testData = {
      userEmail: 'newuser@example.com',
      username: 'newuser123',
      firstName: 'John',
      lastName: 'Doe',
      signupTime: new Date().toLocaleString(),
      signupId: 'signup-test-12345'
    }

    console.log('=== SENDING TEST ADMIN SIGNUP NOTIFICATION TO tim@828.life ===')
    console.log('Test Signup Data:', testData)

    // Send admin signup notification email
    console.log('📧 Sending admin signup notification...')
    const adminResult = await sendEmailDirect({
      to: 'tim@828.life', // Sending to your email for testing
      subject: '👤 New User Signup - The Loser Pool',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f8fafc;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">👤 New User Signup!</h1>
              <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">A new user has just joined The Loser Pool</p>
            </div>
            
            <div style="padding: 32px;">
              <!-- Signup Details -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px;">📊 Signup Summary</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">User</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${testData.firstName} ${testData.lastName}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Username</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${testData.username}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Email</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${testData.userEmail}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Signup Time</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${testData.signupTime}</p>
                  </div>
                </div>
                <div style="background-color: rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 6px;">
                  <p style="margin: 0; font-size: 14px; opacity: 0.9;">Signup ID: ${testData.signupId}</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Status: Pending Email Confirmation</p>
                </div>
              </div>

              <!-- Quick Actions -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 16px 0;">⚡ Quick Actions</h3>
                <div style="text-align: center;">
                  <a href="https://loserpool.vercel.app/admin/users" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 12px;">
                    👥 View User Profile
                  </a>
                  <a href="https://loserpool.vercel.app/admin/users" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
                    📈 Manage Users
                  </a>
                </div>
              </div>

              <!-- Pool Impact -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #166534; margin: 0 0 16px 0;">📊 Pool Impact</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
                  <li>New user has joined the pool</li>
                  <li>User needs to confirm their email before they can play</li>
                  <li>User will receive 10 free picks to start</li>
                  <li>User can purchase additional picks once confirmed</li>
                </ul>
              </div>

              <!-- Next Steps for Admin -->
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #92400e; margin: 0 0 16px 0;">🎯 Admin Next Steps</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #92400e;">
                  <li>Monitor user's email confirmation status</li>
                  <li>Check if user completes their profile</li>
                  <li>Consider sending a welcome message if needed</li>
                  <li>Track user engagement and pick purchases</li>
                </ul>
              </div>

              <!-- User Journey -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #dc2626; margin: 0 0 16px 0;">🛤️ User Journey</h3>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #dc2626;">
                  <li><strong>Signup Complete</strong> - User has created account</li>
                  <li><strong>Email Confirmation</strong> - User needs to confirm email</li>
                  <li><strong>Profile Setup</strong> - User can complete their profile</li>
                  <li><strong>Pick Purchase</strong> - User can buy picks to play</li>
                  <li><strong>Active Player</strong> - User starts making picks</li>
                </ol>
              </div>

              <!-- Footer -->
              <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Pool Growth Alert</p>
                <p style="color: #6b7280; margin: 0 0 16px 0;">Another player has joined the competition!</p>
                
                <div style="margin-top: 24px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The Loser Pool Admin System</p>
                </div>
              </div>

              <!-- Contact Info -->
              <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  This is an automated notification from The Loser Pool admin system.<br>
                  Manage notifications in your admin dashboard.
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    })
    console.log('✅ Admin signup notification email sent with ID:', adminResult.id)

    console.log('=== TEST ADMIN SIGNUP NOTIFICATION COMPLETED ===')

    return NextResponse.json({ 
      success: true, 
      message: 'Test admin signup notification sent successfully to tim@828.life',
      emailSent: `Admin Signup Notification (ID: ${adminResult.id})`,
      signupData: testData
    })

  } catch (error) {
    console.error('Error sending test admin signup notification:', error)
    return NextResponse.json(
      { error: 'Failed to send test admin signup notification', details: error },
      { status: 500 }
    )
  }
}
