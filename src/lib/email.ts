import { createServerSupabaseClient } from '@/lib/supabase-server'

interface PurchaseNotificationData {
  userEmail: string
  username: string
  picksCount: number
  amount: number
  purchaseId: string
}

interface PickReminderData {
  userEmail: string
  username: string
  firstName: string
  lastName: string
  availablePicks: number
  currentWeek: number
  deadline: string
}

export async function sendAdminPurchaseNotification(purchaseData: PurchaseNotificationData) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get all admin users
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('is_admin', true)

    if (adminError) {
      console.error('Error fetching admins:', adminError)
      return
    }

    if (!admins || admins.length === 0) {
      console.log('No admin users found')
      return
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, username')
      .eq('email', purchaseData.userEmail)
      .single()

    if (userError) {
      console.error('Error fetching user details:', userError)
    }

    const userName = user ? 
      `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || purchaseData.username :
      purchaseData.username

    const subject = `New Pick Purchase - ${userName}`
    const body = `
New pick purchase completed:

User: ${userName} (${purchaseData.userEmail})
Picks Purchased: ${purchaseData.picksCount}
Amount: $${(purchaseData.amount / 100).toFixed(2)}
Purchase ID: ${purchaseData.purchaseId}
Date: ${new Date().toLocaleString()}

Pool total picks purchased: [Check admin dashboard for updated totals]
    `.trim()

    // Send email to each admin
    for (const admin of admins) {
      await sendEmail({
        to: admin.email,
        subject,
        body,
        adminName: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin'
      })
    }

    console.log(`Purchase notification sent to ${admins.length} admin(s)`)
  } catch (error) {
    console.error('Error sending admin notification:', error)
  }
}

export async function sendThursdayPickReminders() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current week and deadline from global settings
    const { data: settings, error: settingsError } = await supabase
      .from('global_settings')
      .select('current_week, week1_picks_deadline')
      .single()

    if (settingsError || !settings) {
      console.error('Error fetching global settings:', settingsError)
      return
    }

    // Only send reminders if we're in an active week
    if (settings.current_week < 1) {
      console.log('No active week - skipping reminders')
      return
    }

    // Get all users who have purchased picks but haven't made their picks for current week
    const { data: usersNeedingReminders, error: usersError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        username,
        first_name,
        last_name,
        purchases!inner(
          picks_count,
          status
        )
      `)
      .eq('purchases.status', 'completed')

    if (usersError) {
      console.error('Error fetching users needing reminders:', usersError)
      return
    }

    if (!usersNeedingReminders || usersNeedingReminders.length === 0) {
      console.log('No users need pick reminders')
      return
    }

    let reminderCount = 0

    for (const user of usersNeedingReminders) {
      // Calculate total available picks for this user
      const totalPurchased = user.purchases.reduce((sum: number, purchase: any) => {
        return sum + (purchase.status === 'completed' ? purchase.picks_count : 0)
      }, 0)

      // Check if user has made picks for current week
      const { data: existingPicks, error: picksError } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', user.id)
        .eq('week', settings.current_week)

      if (picksError) {
        console.error(`Error checking picks for user ${user.id}:`, picksError)
        continue
      }

      // If user has no picks for current week, send reminder
      if (!existingPicks || existingPicks.length === 0) {
        const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'
        
        await sendPickReminder({
          userEmail: user.email,
          username: user.username || 'User',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          availablePicks: totalPurchased,
          currentWeek: settings.current_week,
          deadline: settings.week1_picks_deadline
        })

        reminderCount++
      }
    }

    console.log(`Sent ${reminderCount} pick reminders`)
  } catch (error) {
    console.error('Error sending Thursday pick reminders:', error)
  }
}

async function sendPickReminder(reminderData: PickReminderData) {
  const subject = `⚠️ Thursday Pick Reminder - Week ${reminderData.currentWeek}`
  const body = `
Hi ${reminderData.firstName || reminderData.username},

This is your Thursday morning reminder to make your picks for Week ${reminderData.currentWeek}!

You have ${reminderData.availablePicks} picks available to use.

⏰ **DEADLINE**: Tonight at kickoff (${reminderData.deadline})

🏈 **What to do:**
1. Log into your account
2. Go to the Picks page
3. Allocate your picks to teams you think will LOSE
4. Submit before kickoff tonight

Remember: You're picking teams to LOSE! If your picked team wins, you're eliminated from that pick.

🔗 **Quick Links:**
- Dashboard: [Your app URL]/dashboard
- Make Picks: [Your app URL]/picks

Good luck!
The Loser Pool Team
  `.trim()

  console.log(`
=== PICK REMINDER EMAIL ===
To: ${reminderData.userEmail}
Subject: ${subject}
Body:
${body}
=====================================
  `)

  // TODO: Implement actual email sending
  // Example with Supabase email service:
  // const supabase = await createServerSupabaseClient()
  // const { error } = await supabase.auth.admin.sendRawEmail({
  //   to: [reminderData.userEmail],
  //   subject,
  //   html: body.replace(/\n/g, '<br>'),
  //   text: body
  // })
  
  // Example with external service like Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: [reminderData.userEmail],
  //   subject,
  //   html: body.replace(/\n/g, '<br>'),
  //   text: body
  // })
}

interface EmailData {
  to: string
  subject: string
  body: string
  adminName: string
}

async function sendEmail({ to, subject, body, adminName }: EmailData) {
  // For now, we'll use console.log to simulate email sending
  // In production, you would integrate with a service like SendGrid, Resend, or Supabase's email service
  
  console.log(`
=== EMAIL TO ADMIN: ${adminName} ===
To: ${to}
Subject: ${subject}
Body:
${body}
=====================================
  `)

  // TODO: Implement actual email sending
  // Example with Supabase email service:
  // const { error } = await supabase.auth.admin.sendRawEmail({
  //   to: [to],
  //   subject,
  //   html: body.replace(/\n/g, '<br>'),
  //   text: body
  // })
  
  // Example with external service like Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY)
  // await resend.emails.send({
  //   from: 'noreply@yourdomain.com',
  //   to: [to],
  //   subject,
  //   html: body.replace(/\n/g, '<br>'),
  //   text: body
  // })
} 