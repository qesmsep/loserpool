import { NextRequest, NextResponse } from 'next/server'
import { sendAdminPurchaseNotification, sendUserPurchaseConfirmation } from '@/lib/email'

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
    // Test purchase data
    const testData = {
      userEmail: 'tim@828.life',
      username: 'Tim Wirick',
      picksCount: 5,
      amount: 10500, // $105.00 in cents
      purchaseId: 'test-purchase-12345'
    }

    console.log('=== SENDING TEST EMAILS TO tim@828.life ===')
    console.log('Test Purchase Data:', testData)

    // Send admin notification with direct email call
    console.log('📧 Sending admin notification directly...')
    const adminResult = await sendEmailDirect({
      to: testData.userEmail, // Sending to your email for testing
      subject: '🚨 New Pick Purchase - Admin Notification',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🚨 New Purchase Alert</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">A new pick purchase has been completed</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #333333; margin-top: 0;">Purchase Details</h2>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <p style="margin: 8px 0;"><strong>Customer:</strong> ${testData.username}</p>
                <p style="margin: 8px 0;"><strong>Email:</strong> ${testData.userEmail}</p>
                <p style="margin: 8px 0;"><strong>Picks Purchased:</strong> ${testData.picksCount}</p>
                <p style="margin: 8px 0;"><strong>Amount:</strong> $${(testData.amount / 100).toFixed(2)}</p>
                <p style="margin: 8px 0;"><strong>Purchase ID:</strong> ${testData.purchaseId}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://loserpool.vercel.app/admin/users" style="background-color: #667eea; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Admin Dashboard</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `
    })
    console.log('✅ Admin notification email sent with ID:', adminResult.id)

    // Send user confirmation with direct email call
    console.log('📧 Sending user confirmation directly...')
    const userResult = await sendEmailDirect({
      to: testData.userEmail,
      subject: '🎉 Welcome to The Loser Pool - Your Picks Are Ready!',
      htmlBody: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🎉 Payment Confirmed!</h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; opacity: 0.9;">Your picks have been added to your account</p>
            </div>
            
            <div style="padding: 30px;">
              <h2 style="color: #333333; margin-top: 0;">Hello ${testData.username}!</h2>
              
              <p style="color: #666666; line-height: 1.6;">
                Thank you for your purchase! Your payment has been successfully processed and your picks have been added to your account.
              </p>
              
              <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #333333; margin-top: 0;">Purchase Summary</h3>
                <p style="margin: 8px 0;"><strong>Picks Added:</strong> ${testData.picksCount}</p>
                <p style="margin: 8px 0;"><strong>Amount Paid:</strong> $${(testData.amount / 100).toFixed(2)}</p>
                <p style="margin: 8px 0;"><strong>Purchase ID:</strong> ${testData.purchaseId}</p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://loserpool.vercel.app/dashboard" style="background-color: #11998e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Go to Dashboard</a>
              </div>
              
              <p style="color: #666666; font-size: 14px; margin-top: 30px;">
                A payment receipt has been sent to your email address. If you have any questions, please contact support.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    })
    console.log('✅ User confirmation email sent with ID:', userResult.id)

    console.log('=== TEST EMAILS COMPLETED ===')

    return NextResponse.json({ 
      success: true, 
      message: 'Test emails sent successfully to tim@828.life',
      emailsSent: [
        `Admin Purchase Notification (ID: ${adminResult.id})`,
        `User Purchase Confirmation (ID: ${userResult.id})`
      ]
    })

  } catch (error) {
    console.error('Error sending test emails:', error)
    return NextResponse.json(
      { error: 'Failed to send test emails', details: error },
      { status: 500 }
    )
  }
}