import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export interface PasswordResetEmailData {
  email: string
  resetUrl: string
  userName?: string
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData) {
  console.log('📧 [RESEND] Starting email send for:', data.email)
  
  try {
    const { email, resetUrl, userName } = data
    
    console.log('📧 [RESEND] Email data prepared:', {
      email: email,
      userName: userName || 'not provided',
      resetUrlLength: resetUrl.length
    })
    
    const result = await resend.emails.send({
      from: 'Loser Pool <noreply@loserpool.app>',
      to: [email],
      subject: 'Reset Your Loser Pool Password',
      html: generatePasswordResetEmailHTML({ resetUrl, userName }),
      text: generatePasswordResetEmailText({ resetUrl, userName }),
    })

    console.log('✅ [RESEND] Email sent successfully:', result)
    return { success: true, data: result }
  } catch (error) {
    console.error('❌ [RESEND] Failed to send password reset email:', error)
    return { success: false, error }
  }
}

function generatePasswordResetEmailHTML({ resetUrl, userName }: { resetUrl: string; userName?: string }) {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Loser Pool</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>${greeting}</p>
          <p>We received a request to reset your password for your Loser Pool account. Click the button below to create a new password:</p>
          
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          
          <div class="warning">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.
          </div>
          
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #1e40af;">${resetUrl}</p>
          
          <p>Thanks,<br>The Loser Pool Team</p>
        </div>
        <div class="footer">
          <p>This email was sent to you because someone requested a password reset for your Loser Pool account.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generatePasswordResetEmailText({ resetUrl, userName }: { resetUrl: string; userName?: string }) {
  const greeting = userName ? `Hi ${userName},` : 'Hi there,'
  
  return `
Reset Your Loser Pool Password

${greeting}

We received a request to reset your password for your Loser Pool account. Click the link below to create a new password:

${resetUrl}

Important: This link will expire in 1 hour for security reasons. If you didn't request this password reset, you can safely ignore this email.

Thanks,
The Loser Pool Team

---
This email was sent to you because someone requested a password reset for your Loser Pool account.
  `.trim()
}
