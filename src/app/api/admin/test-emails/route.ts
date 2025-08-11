import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendPickReminders, sendWelcomeEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!userProfile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { emailType, userId } = body

    let result: { success: number; failed: number } = { success: 0, failed: 0 }

    switch (emailType) {
      case 'pick_reminders':
        result = await sendPickReminders()
        return NextResponse.json({
          success: true,
          message: `Pick reminders sent: ${result.success} success, ${result.failed} failed`,
          result
        })

      case 'welcome':
        if (!userId) {
          return NextResponse.json({ error: 'User ID required for welcome email' }, { status: 400 })
        }
        const success = await sendWelcomeEmail(userId)
        return NextResponse.json({
          success,
          message: success ? 'Welcome email sent successfully' : 'Failed to send welcome email'
        })

      case 'test_to_admin':
        // Send a test email to the admin
        const { data: adminUser } = await supabase
          .from('users')
          .select('id, email, first_name, username')
          .eq('id', user.id)
          .single()

        if (adminUser) {
          const { sendTemplateEmail, getEmailTemplates } = await import('@/lib/email-templates')
          const templates = await getEmailTemplates('pick_reminder')
          
          if (templates.length > 0) {
            const template = templates[0]
            const success = await sendTemplateEmail(template, {
              user: {
                id: adminUser.id,
                email: adminUser.email,
                first_name: adminUser.first_name,
                username: adminUser.username,
                picks_remaining: 5,
                is_eliminated: false
              },
              week_number: 1,
              picks_deadline: 'Tomorrow at 2:00 PM',
              pool_name: 'The Loser Pool',
              admin_name: 'Admin',
              total_players: 10,
              prize_pool: 21000
            })
            
            return NextResponse.json({
              success,
              message: success ? 'Test email sent to admin' : 'Failed to send test email',
              email: adminUser.email
            })
          }
        }
        return NextResponse.json({ error: 'No templates found' }, { status: 404 })

      default:
        return NextResponse.json({ error: 'Invalid email type' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in test emails endpoint:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
