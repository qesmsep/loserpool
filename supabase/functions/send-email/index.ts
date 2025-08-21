import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface EmailRequest {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
}

interface EmailResponse {
  success: boolean
  message: string
  emailId?: string
  error?: string
}

// You can use any email service here - Resend, SendGrid, etc.
// For this example, I'll use Resend as it's simple and has a good free tier
async function sendEmailViaResend(emailData: EmailRequest): Promise<EmailResponse> {
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured in Supabase environment variables')
  }

  const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
              body: JSON.stringify({
          from: emailData.from || 'noreply@loserpool.com', // Update this to your actual domain
          to: recipients,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
        }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || 'Failed to send email')
    }

    return {
      success: true,
      message: `Email sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`,
      emailId: result.id
    }
  } catch (error) {
    console.error('Resend email error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

// Alternative: SendGrid implementation
async function sendEmailViaSendGrid(emailData: EmailRequest): Promise<EmailResponse> {
  const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
  
  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured in Supabase environment variables')
  }

  const recipients = Array.isArray(emailData.to) ? emailData.to : [emailData.to]
  
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: recipients.map(email => ({ email }))
        }],
        from: { email: emailData.from || 'noreply@loserpool.com' },
        subject: emailData.subject,
        content: [
          {
            type: 'text/plain',
            value: emailData.text
          },
          {
            type: 'text/html',
            value: emailData.html
          }
        ]
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`SendGrid error: ${response.status} - ${errorText}`)
    }

    return {
      success: true,
      message: `Email sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`,
      emailId: response.headers.get('x-message-id') || undefined
    }
  } catch (error) {
    console.error('SendGrid email error:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    })
  }

  try {
    // Verify the request is from your app
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const emailData: EmailRequest = await req.json()
    
    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: to, subject, html' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Choose email service based on environment variables
    let result: EmailResponse
    
    if (Deno.env.get('RESEND_API_KEY')) {
      result = await sendEmailViaResend(emailData)
    } else if (Deno.env.get('SENDGRID_API_KEY')) {
      result = await sendEmailViaSendGrid(emailData)
    } else {
      return new Response(JSON.stringify({ 
        error: 'No email service configured. Set RESEND_API_KEY or SENDGRID_API_KEY in Supabase environment variables.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
