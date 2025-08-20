import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    
    console.log('=== TESTING ADMIN NOTIFICATIONS ===')
    
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_admin')
      .eq('is_admin', true)

    if (adminError) {
      console.error('Error fetching admins:', adminError)
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
    }

    console.log(`Found ${admins?.length || 0} admin users:`)
    if (admins) {
      admins.forEach(admin => {
        console.log(`- ${admin.email} (${admin.first_name || ''} ${admin.last_name || ''})`)
      })
    }

    if (!admins || admins.length === 0) {
      return NextResponse.json({ 
        message: 'No admin users found',
        adminCount: 0
      })
    }

    // Send test notification to each admin
    const results = []
    for (const admin of admins) {
      try {
        // Add delay between emails to respect rate limits (2 requests per second = 500ms delay)
        if (results.length > 0) {
          console.log(`⏳ Waiting 500ms before sending next email (rate limit compliance)...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        const subject = '🧪 Test Admin Notification - All Admins'
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
            <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 8px 0;">🧪 Test Admin Notification</h1>
                <p style="color: #6b7280; font-size: 16px; margin: 0;">Testing admin notification system</p>
              </div>

              <!-- Test Details -->
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; font-size: 20px;">📊 Test Information</h2>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Recipient</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${admin.first_name || ''} ${admin.last_name || ''}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Email</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${admin.email}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Admin Status</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${admin.is_admin ? '✅ Admin' : '❌ Not Admin'}</p>
                  </div>
                  <div>
                    <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Test Time</p>
                    <p style="margin: 0; font-size: 18px; font-weight: 600;">${new Date().toLocaleString()}</p>
                  </div>
                </div>
                <div style="background-color: rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 6px;">
                  <p style="margin: 0; font-size: 14px; opacity: 0.9;">Total Admins Found: ${admins.length}</p>
                  <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Test ID: ${Date.now()}</p>
                </div>
              </div>

              <!-- Admin List -->
              <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <h3 style="color: #0369a1; margin: 0 0 16px 0;">👥 All Admin Users</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #0369a1;">
                  ${admins.map(admin => `<li>${admin.email} (${admin.first_name || ''} ${admin.last_name || ''})</li>`).join('')}
                </ul>
              </div>

              <!-- Footer -->
              <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
                <p style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">The Loser Pool Admin</p>
                <p style="color: #6b7280; margin: 0;">This is a test notification to verify admin notification system.</p>
              </div>
            </div>
          </div>
        `

        const result = await sendEmail({
          to: admin.email,
          subject,
          html: htmlBody,
          text: `Test Admin Notification\n\nRecipient: ${admin.first_name || ''} ${admin.last_name || ''}\nEmail: ${admin.email}\nAdmin Status: ${admin.is_admin ? 'Admin' : 'Not Admin'}\nTest Time: ${new Date().toLocaleString()}\nTotal Admins Found: ${admins.length}`
        })

        if (result.success) {
          console.log(`✅ Test notification sent to ${admin.email}`)
          results.push({
            email: admin.email,
            success: true,
            message: 'Email sent successfully'
          })
        } else {
          console.error(`❌ Failed to send test notification to ${admin.email}:`, result.error)
          results.push({
            email: admin.email,
            success: false,
            error: result.error
          })
        }
      } catch (emailError) {
        console.error(`❌ Error sending test notification to ${admin.email}:`, emailError)
        results.push({
          email: admin.email,
          success: false,
          error: emailError instanceof Error ? emailError.message : 'Unknown error'
        })
      }
    }

    const successfulSends = results.filter(r => r.success).length
    const failedSends = results.filter(r => !r.success).length

    console.log(`=== TEST COMPLETED ===`)
    console.log(`Total admins: ${admins.length}`)
    console.log(`Successful sends: ${successfulSends}`)
    console.log(`Failed sends: ${failedSends}`)

    return NextResponse.json({
      message: 'Test admin notifications completed',
      adminCount: admins.length,
      successfulSends,
      failedSends,
      results
    })

  } catch (error) {
    console.error('Error in test admin notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Also allow GET for manual testing
export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_admin')
      .eq('is_admin', true)

    if (adminError) {
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Admin users found',
      adminCount: admins?.length || 0,
      admins: admins || []
    })

  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
