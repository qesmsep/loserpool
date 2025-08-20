// import { createServerSupabaseClient } from './supabase-server'

export interface EmailData {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
}

export interface EmailResult {
  success: boolean
  message: string
  provider: string
  emailId?: string
  error?: string
}

// Email service configuration
const EMAIL_CONFIG = {
  provider: process.env.EMAIL_PROVIDER || 'console', // 'console', 'supabase', 'resend', 'sendgrid'
  fromEmail: process.env.FROM_EMAIL || 'noreply@loserpool.com',
  apiKey: process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY, // Support both EMAIL_API_KEY and RESEND_API_KEY
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
}

export async function sendEmail(emailData: EmailData): Promise<EmailResult> {
  console.log('🔍 Email Service Debug:', {
    provider: EMAIL_CONFIG.provider,
    to: emailData.to,
    subject: emailData.subject,
    hasApiKey: !!EMAIL_CONFIG.apiKey,
    hasSupabaseKey: !!EMAIL_CONFIG.supabaseServiceKey
  })

  try {
    switch (EMAIL_CONFIG.provider) {
      case 'supabase':
        return await sendViaSupabase(emailData)
      case 'resend':
        return await sendViaResend(emailData)
      case 'sendgrid':
        return await sendViaSendGrid(emailData)
      case 'console':
      default:
        return await sendViaConsole(emailData)
    }
  } catch (error) {
    console.error('❌ Email sending failed:', error)
    return {
      success: false,
      message: 'Email sending failed',
      provider: EMAIL_CONFIG.provider,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function sendViaConsole(emailData: EmailData): Promise<EmailResult> {
  const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
  
  console.log(`
📧 CONSOLE EMAIL (DEBUG MODE)
=====================================
From: ${emailData.from || EMAIL_CONFIG.fromEmail}
To: ${recipients.join(', ')}
Subject: ${emailData.subject}
=====================================
HTML Content:
${emailData.html}
=====================================
Text Content:
${emailData.text}
=====================================
📧 END EMAIL
  `)

  return {
    success: true,
    message: `Email logged to console (${recipients.length} recipient${recipients.length > 1 ? 's' : ''})`,
    provider: 'console',
    emailId: `console-${Date.now()}`
  }
}

async function sendViaSupabase(emailData: EmailData): Promise<EmailResult> {
  if (!EMAIL_CONFIG.supabaseUrl) {
    throw new Error('Supabase URL not configured')
  }

  console.log('📧 Attempting to send via Supabase Edge Function...')

  try {
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
    
    // Call the Supabase Edge Function
    const response = await fetch(`${EMAIL_CONFIG.supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${EMAIL_CONFIG.supabaseServiceKey}`,
      },
      body: JSON.stringify({
        to: recipients,
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
        from: emailData.from || EMAIL_CONFIG.fromEmail
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send email via Supabase Edge Function')
    }

    if (result.success) {
      console.log('✅ Supabase Edge Function email sent successfully:', result)
      return {
        success: true,
        message: `Email sent via Supabase Edge Function (${recipients.length} recipient${recipients.length > 1 ? 's' : ''})`,
        provider: 'supabase',
        emailId: result.emailId
      }
    } else {
      throw new Error(result.message || 'Email sending failed')
    }
  } catch (error) {
    console.error('❌ Supabase Edge Function email failed:', error)
    // Fallback to console if Supabase email fails
    console.log('📧 Falling back to console mode due to Supabase Edge Function error')
    return await sendViaConsole(emailData)
  }
}

async function sendViaResend(emailData: EmailData): Promise<EmailResult> {
  if (!EMAIL_CONFIG.apiKey) {
    throw new Error('Resend API key not configured')
  }

  console.log('📧 Attempting to send via Resend...')

  // Check if Resend package is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Resend: any
  try {
    // Use eval to avoid TypeScript module resolution
    const resendModule = await eval('import("resend")')
    Resend = resendModule.Resend
  } catch {
    console.log('📧 Resend package not available - falling back to console mode')
    return await sendViaConsole(emailData)
  }

  try {
    const resend = new Resend(EMAIL_CONFIG.apiKey)
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
    
    const { data, error } = await resend.emails.send({
      from: emailData.from || EMAIL_CONFIG.fromEmail,
      to: recipients,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    })

    if (error) {
      throw error
    }

    console.log('✅ Resend email sent successfully:', data)
    return {
      success: true,
      message: `Email sent via Resend (${recipients.length} recipient${recipients.length > 1 ? 's' : ''})`,
      provider: 'resend',
      emailId: data?.id
    }
  } catch (error) {
    console.error('❌ Resend email failed:', error)
    console.log('📧 Falling back to console mode due to Resend error')
    return await sendViaConsole(emailData)
  }
}

async function sendViaSendGrid(emailData: EmailData): Promise<EmailResult> {
  if (!EMAIL_CONFIG.apiKey) {
    throw new Error('SendGrid API key not configured')
  }

  console.log('📧 Attempting to send via SendGrid...')

  // Check if SendGrid package is available
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sgMail: any
  try {
    // Use eval to avoid TypeScript module resolution
    sgMail = await eval('import("@sendgrid/mail")')
  } catch {
    console.log('📧 SendGrid package not available - falling back to console mode')
    return await sendViaConsole(emailData)
  }

  try {
    sgMail.setApiKey(EMAIL_CONFIG.apiKey)
    const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
    
    const msg = {
      to: recipients,
      from: emailData.from || EMAIL_CONFIG.fromEmail,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text
    }

    const [response] = await sgMail.send(msg)

    console.log('✅ SendGrid email sent successfully:', response)
    return {
      success: true,
      message: `Email sent via SendGrid (${recipients.length} recipient${recipients.length > 1 ? 's' : ''})`,
      provider: 'sendgrid',
      emailId: response.headers['x-message-id']
    }
  } catch (error) {
    console.error('❌ SendGrid email failed:', error)
    console.log('📧 Falling back to console mode due to SendGrid error')
    return await sendViaConsole(emailData)
  }
}

// Helper function to get email configuration status
export function getEmailConfigStatus() {
  return {
    provider: EMAIL_CONFIG.provider,
    configured: !!EMAIL_CONFIG.apiKey || EMAIL_CONFIG.provider === 'console',
    hasSupabaseKey: !!EMAIL_CONFIG.supabaseServiceKey,
    fromEmail: EMAIL_CONFIG.fromEmail
  }
}
