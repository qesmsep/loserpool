import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { to = 'tim@828.life' } = await request.json()
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY

    if (!apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'No Resend API key found' 
      }, { status: 400 })
    }

    console.log('🧪 Testing Resend API directly...')
    console.log('📧 To:', to)
    console.log('🔑 API Key length:', apiKey.length)

    // Make direct API call to Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: [to],
        subject: '🧪 Direct Resend API Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1e40af;">🧪 Direct Resend API Test</h1>
            <p>This email was sent directly via the Resend API.</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Test Type:</strong> Direct API Call</p>
            <hr>
            <p style="color: #6b7280; font-size: 14px;">
              If you received this email, the Resend API key is working correctly!
            </p>
          </div>
        `,
        text: `Direct Resend API Test\n\nThis email was sent directly via the Resend API.\nTimestamp: ${new Date().toLocaleString()}\nTest Type: Direct API Call\n\nIf you received this email, the Resend API key is working correctly!`
      })
    })

    const result = await response.json()

    console.log('📧 Resend API response status:', response.status)
    console.log('📧 Resend API response:', result)

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Resend API call failed',
        status: response.status,
        details: result
      }, { status: response.status })
    }

    return NextResponse.json({
      success: true,
      message: 'Direct Resend API test completed',
      emailId: result.id,
      status: response.status,
      details: result
    })

  } catch (error) {
    console.error('❌ Error testing Resend API directly:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test Resend API',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    const apiKey = process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY
    
    return NextResponse.json({
      message: 'Direct Resend API test endpoint',
      usage: 'POST with { "to": "email@example.com" } to send test email',
      config: {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey ? apiKey.length : 0
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
