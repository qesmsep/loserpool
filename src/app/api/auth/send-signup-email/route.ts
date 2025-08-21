import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Import the sendEmail function directly
import { Resend } from 'resend'

async function sendEmailDirect(emailData: {
  to: string
  subject: string
  htmlBody: string
}) {
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

export async function POST(request: Request) {
  try {
    const { email, firstName, lastName, username } = await request.json()
    const supabase = await createServerSupabaseClient()
    
    // Create a confirmation link
    const confirmationLink = `https://loserpool.vercel.app/api/auth/confirm-email?email=${encodeURIComponent(email)}`
    
    // Get user display name
    const displayName = firstName && lastName ? `${firstName} ${lastName}` : username || 'there'
    
    console.log('Sending signup confirmation email:', {
      to: email,
      displayName,
      link: confirmationLink
    })

    // Send the styled signup confirmation email
    const emailResult = await sendEmailDirect({
      to: email,
      subject: '🎉 Welcome to The Loser Pool! Confirm Your Email',
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
              <h1 style="color: #ffffff; margin: 0 0 8px 0; font-size: 28px; font-weight: bold;">🎉 Welcome to The Loser Pool!</h1>
              <p style="color: #ffffff; margin: 0; font-size: 16px; opacity: 0.9;">You've just joined the most exciting NFL elimination pool around!</p>
            </div>
            
            <div style="padding: 32px;">
              <!-- Welcome Message -->
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px;">🏈 What is The Loser Pool?</h2>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
                  <li>Pick teams that you think will <strong>LOSE</strong> each week</li>
                  <li>If your pick wins, you're eliminated from that pick</li>
                  <li>Last person standing wins the entire pool!</li>
                  <li>It's simple, exciting, and anyone can win!</li>
                </ul>
              </div>

              <!-- Next Steps -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 16px 0;">🚀 What happens next?</h3>
                <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #1e40af;">
                  <li><strong>Confirm your email</strong> by clicking the button below</li>
                  <li><strong>Log into your account</strong> and explore your dashboard</li>
                  <li><strong>Purchase picks</strong> to get started (you get 10 picks to start!)</li>
                  <li><strong>Make your first picks</strong> for the upcoming week</li>
                  <li><strong>Watch the games</strong> and hope your picks lose!</li>
                </ol>
              </div>

              <!-- Important Notice -->
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">⏰ Important: You need to confirm your email before you can start playing.</p>
              </div>

              <!-- Confirmation Button -->
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${confirmationLink}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                  🔗 Confirm Your Email & Get Started
                </a>
              </div>

              <!-- Fallback Link -->
              <div style="text-align: center; margin-bottom: 24px;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link:</p>
                <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 0;">
                  ${confirmationLink}
                </p>
              </div>

              <!-- Quick Tips -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #166534; margin: 0 0 16px 0;">🎯 Quick Tips</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
                  <li>Check your spam folder if you don't see this email</li>
                  <li>Make sure to confirm your email within 24 hours</li>
                  <li>Once confirmed, you can log in and start playing immediately</li>
                </ul>
              </div>

              <!-- Pool Highlights -->
              <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #dc2626; margin: 0 0 16px 0;">🏆 Pool Highlights</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #dc2626;">
                  <li>Weekly elimination format</li>
                  <li>Real-time leaderboards</li>
                  <li>Mobile-friendly interface</li>
                  <li>Fair and transparent rules</li>
                  <li>Exciting prizes for winners</li>
                </ul>
              </div>

              <!-- Footer -->
              <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">We can't wait to see you in action!</p>
                <p style="color: #6b7280; margin: 0 0 16px 0;">Good luck, and remember - you're picking teams to LOSE!</p>
                
                <div style="margin-top: 24px;">
                  <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The Loser Pool Team</p>
                </div>
              </div>

              <!-- Contact Info -->
              <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  Questions? Reply to this email or contact us at support@loserpool.com<br>
                  Follow us on social media for updates and announcements!
                </p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    })

    console.log('✅ Signup confirmation email sent successfully:', {
      emailId: emailResult.id,
      to: email,
      displayName
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Signup confirmation email sent successfully',
      emailId: emailResult.id,
      confirmationLink: confirmationLink
    })

  } catch (error) {
    console.error('Signup email error:', error)
    return NextResponse.json({ error: 'Failed to send signup email' }, { status: 500 })
  }
}
