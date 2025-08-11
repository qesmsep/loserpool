import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/email-service'

interface ImmediateEmailRequest {
  name: string
  subject: string
  body: string
  trigger_type: 'pick_reminder' | 'welcome' | 'elimination' | 'custom'
  timing: 'immediately' | 'morning_before_first_game' | 'day_before' | 'custom'
  custom_timing?: string
  is_active: boolean
  recipient_type: 'specific_email' | 'all_users' | 'all_active_players' | 'all_admins' | 'custom'
  specific_email?: string
  custom_recipients?: string
}

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

    const formData: ImmediateEmailRequest = await request.json()

    // Validate required fields
    if (!formData.name || !formData.subject || !formData.body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get recipients based on recipient_type
    let recipients: string[] = []

    switch (formData.recipient_type) {
      case 'specific_email':
        if (!formData.specific_email) {
          return NextResponse.json({ error: 'Email address required for specific email' }, { status: 400 })
        }
        recipients = [formData.specific_email]
        break

      case 'all_users':
        const { data: allUsers } = await supabase
          .from('users')
          .select('email')
          .not('email', 'is', null)
        
        if (allUsers) {
          recipients = allUsers.map(user => user.email).filter(Boolean)
        }
        break

      case 'all_active_players':
        // First get all user IDs who have made picks
        const { data: activeUserIds } = await supabase
          .from('picks')
          .select('user_id')
          .not('user_id', 'is', null)
        
        if (activeUserIds && activeUserIds.length > 0) {
          const userIds = [...new Set(activeUserIds.map(pick => pick.user_id))]
          
          // Then get emails for those users
          const { data: activePlayers } = await supabase
            .from('users')
            .select('email')
            .in('id', userIds)
            .not('email', 'is', null)
          
          if (activePlayers) {
            recipients = activePlayers.map(user => user.email).filter(Boolean)
          }
        }
        break

      case 'all_admins':
        const { data: admins } = await supabase
          .from('users')
          .select('email')
          .eq('is_admin', true)
          .not('email', 'is', null)
        
        if (admins) {
          recipients = admins.map(user => user.email).filter(Boolean)
        }
        break

      case 'custom':
        if (!formData.custom_recipients) {
          return NextResponse.json({ error: 'Custom recipients required' }, { status: 400 })
        }
        recipients = formData.custom_recipients
          .split(',')
          .map(email => email.trim())
          .filter(email => email && email.includes('@'))
        break

      default:
        return NextResponse.json({ error: 'Invalid recipient type' }, { status: 400 })
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 })
    }

    console.log(`📧 Sending immediate email to ${recipients.length} recipients:`, recipients)

    // Send the email
    const result = await sendEmail({
      to: recipients,
      subject: formData.subject,
      html: formData.body.replace(/\n/g, '<br>'),
      text: formData.body
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Email sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''} via ${result.provider}`,
        provider: result.provider,
        emailId: result.emailId,
        recipientCount: recipients.length
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.error || 'Failed to send email',
        provider: result.provider
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error sending immediate email:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
