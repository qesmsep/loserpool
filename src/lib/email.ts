import { createServiceRoleClient } from '@/lib/supabase-server'
import { calculatePicksDeadline } from './timezone'
import { sendEmail } from './email-service'

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
    const supabase = createServiceRoleClient()
    
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

    const subject = `🎉 New Pick Purchase - ${userName}`
    
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 8px 0;">💰 New Pick Purchase!</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">A user has just purchased picks in The Loser Pool</p>
        </div>

        <!-- Purchase Details -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px;">📊 Purchase Summary</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">User</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${userName}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Email</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${purchaseData.userEmail}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Picks Purchased</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${purchaseData.picksCount}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Amount</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">$${(purchaseData.amount / 100).toFixed(2)}</p>
            </div>
          </div>
          <div style="background-color: rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Purchase ID: ${purchaseData.purchaseId}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Date: ${new Date().toLocaleString()}</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #0369a1; margin: 0 0 16px 0;">⚡ Quick Actions</h3>
          <div style="text-align: center;">
            <a href="https://loserpool.vercel.app/admin/users" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 12px;">
              👥 View User Profile
            </a>
            <a href="https://loserpool.vercel.app/admin/purchases" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📈 View Purchase History
            </a>
          </div>
        </div>

        <!-- Pool Stats -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #166534; margin: 0 0 16px 0;">📊 Pool Impact</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
            <li>User now has ${purchaseData.picksCount} additional picks to allocate</li>
            <li>Total pool revenue increased by $${(purchaseData.amount / 100).toFixed(2)}</li>
            <li>User can start making picks immediately</li>
          </ul>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
          <p style="color: #1e40af; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">The Loser Pool Admin</p>
          <p style="color: #6b7280; margin: 0;">This is an automated notification from The Loser Pool system.</p>
        </div>
      </div>
    </div>
    `

    // Send email to each admin
    for (const admin of admins) {
      // Add delay between emails to respect rate limits (2 requests per second = 500ms delay)
      if (admins.indexOf(admin) > 0) {
        console.log(`⏳ Waiting 500ms before sending next admin notification (rate limit compliance)...`)
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      await sendEmail({
        to: admin.email,
        subject,
        html: htmlBody,
        text: `New Pick Purchase - ${userName}\n\nUser: ${userName}\nEmail: ${purchaseData.userEmail}\nPicks: ${purchaseData.picksCount}\nAmount: $${(purchaseData.amount / 100).toFixed(2)}\nPurchase ID: ${purchaseData.purchaseId}`
      })
    }

    console.log(`Purchase notification sent to ${admins.length} admin(s)`)
  } catch (error) {
    console.error('Error sending admin notification:', error)
  }
}

export async function sendThursdayPickReminders() {
  try {
    const supabase = createServiceRoleClient()
    
    // Get current week from global settings
    const { data: settings, error: settingsError } = await supabase
      .from('global_settings')
      .select('current_week')
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

    // Get current week matchups to calculate deadline
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', settings.current_week)
      .order('game_time')

    if (matchupsError) {
      console.error('Error fetching matchups:', matchupsError)
      return
    }

    // Calculate deadline based on matchups
    const deadline = calculatePicksDeadline(matchups || [])

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
      const totalPurchased = user.purchases.reduce((sum: number, purchase: { status: string; picks_count: number }) => {
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
        // const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'User'
        
        await sendPickReminder({
          userEmail: user.email,
          username: user.username || 'User',
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          availablePicks: totalPurchased,
          currentWeek: settings.current_week,
          deadline: deadline
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

export async function sendUserPurchaseConfirmation(purchaseData: PurchaseNotificationData) {
  try {
    const supabase = createServiceRoleClient()
    
    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('first_name, last_name, username')
      .eq('email', purchaseData.userEmail)
      .single()

    if (userError) {
      console.error('Error fetching user details:', userError)
      return
    }

    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || purchaseData.username

    const subject = `🎉 Your Pick Purchase is Complete!`
    
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 8px 0;">🎉 Purchase Complete!</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">Your picks have been added to your account</p>
        </div>

        <!-- Success Message -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px;">✅ Payment Processed Successfully</h2>
          <p style="margin: 0; font-size: 16px; line-height: 1.6;">
            Hi ${userName}, your payment has been processed and ${purchaseData.picksCount} picks have been added to your account!
          </p>
        </div>

        <!-- Purchase Details -->
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #0369a1; margin: 0 0 16px 0;">📊 Purchase Summary</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">Picks Purchased</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e40af;">${purchaseData.picksCount}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; color: #6b7280;">Amount Paid</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600; color: #1e40af;">$${(purchaseData.amount / 100).toFixed(2)}</p>
            </div>
          </div>
          <div style="background-color: #e0f2fe; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; color: #0369a1;">
              <strong>Purchase ID:</strong> ${purchaseData.purchaseId}<br>
              <strong>Date:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
        </div>

        <!-- Next Steps -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #166534; margin: 0 0 16px 0;">🚀 What's Next?</h3>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
            <li><strong>Go to your dashboard</strong> to see your new picks</li>
            <li><strong>Allocate your picks</strong> to specific weeks</li>
            <li><strong>Make your selections</strong> for the upcoming games</li>
            <li><strong>Watch the games</strong> and hope your picks lose!</li>
          </ol>
        </div>

        <!-- Dashboard Button -->
        <div style="text-align: center; margin-bottom: 24px;">
          <a href="https://loserpool.vercel.app/dashboard" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
            🏠 Go to Your Dashboard
          </a>
        </div>

        <!-- Important Reminders -->
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="color: #92400e; margin: 0 0 12px 0;">⏰ Important Reminders</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #92400e;">
            <li>Picks lock on Thursday nights before games</li>
            <li>You're picking teams to <strong>LOSE</strong>, not win!</li>
            <li>Check your dashboard regularly for updates</li>
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
          <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Welcome to The Loser Pool!</p>
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
    `

    await sendEmail({
      to: purchaseData.userEmail,
      subject,
      html: htmlBody,
      text: `Purchase Complete!\n\nHi ${userName}, your payment has been processed and ${purchaseData.picksCount} picks have been added to your account!\n\nPurchase Summary:\n- Picks Purchased: ${purchaseData.picksCount}\n- Amount Paid: $${(purchaseData.amount / 100).toFixed(2)}\n- Purchase ID: ${purchaseData.purchaseId}\n- Date: ${new Date().toLocaleString()}\n\nGo to your dashboard to start making picks: https://loserpool.vercel.app/dashboard`
    })

    console.log(`Purchase confirmation sent to user: ${purchaseData.userEmail}`)
  } catch (error) {
    console.error('Error sending user purchase confirmation:', error)
  }
}

export async function sendAdminSignupNotification(signupData: SignupNotificationData) {
  try {
    const supabase = createServiceRoleClient()
    
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

    const subject = `👤 New User Signup - ${signupData.firstName} ${signupData.lastName}`
    
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
      <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 8px 0;">👤 New User Signup!</h1>
          <p style="color: #6b7280; font-size: 16px; margin: 0;">A new user has just joined The Loser Pool</p>
        </div>

        <!-- Signup Details -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
          <h2 style="margin: 0 0 16px 0; font-size: 20px;">📊 Signup Summary</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">User</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${signupData.firstName} ${signupData.lastName}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Username</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${signupData.username}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Email</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${signupData.userEmail}</p>
            </div>
            <div>
              <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.9;">Signup Time</p>
              <p style="margin: 0; font-size: 18px; font-weight: 600;">${signupData.signupTime}</p>
            </div>
          </div>
          <div style="background-color: rgba(255, 255, 255, 0.1); padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Signup ID: ${signupData.signupId}</p>
            <p style="margin: 4px 0 0 0; font-size: 14px; opacity: 0.9;">Status: Pending Email Confirmation</p>
          </div>
        </div>

        <!-- Quick Actions -->
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #0369a1; margin: 0 0 16px 0;">⚡ Quick Actions</h3>
          <div style="text-align: center;">
            <a href="https://loserpool.vercel.app/admin/users" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 12px;">
              👥 View User Profile
            </a>
            <a href="https://loserpool.vercel.app/admin/users" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              📈 Manage Users
            </a>
          </div>
        </div>

        <!-- Pool Impact -->
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #166534; margin: 0 0 16px 0;">📊 Pool Impact</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
            <li>New user has joined the pool</li>
            <li>User needs to confirm their email before they can play</li>
            <li>User will receive 10 free picks to start</li>
            <li>User can purchase additional picks once confirmed</li>
          </ul>
        </div>

        <!-- Next Steps for Admin -->
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #92400e; margin: 0 0 16px 0;">🎯 Admin Next Steps</h3>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #92400e;">
            <li>Monitor user's email confirmation status</li>
            <li>Check if user completes their profile</li>
            <li>Consider sending a welcome message if needed</li>
            <li>Track user engagement and pick purchases</li>
          </ul>
        </div>

        <!-- User Journey -->
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <h3 style="color: #dc2626; margin: 0 0 16px 0;">🛤️ User Journey</h3>
          <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #dc2626;">
            <li><strong>Signup Complete</strong> - User has created account</li>
            <li><strong>Email Confirmation</strong> - User needs to confirm email</li>
            <li><strong>Profile Setup</strong> - User can complete their profile</li>
            <li><strong>Pick Purchase</strong> - User can buy picks to play</li>
            <li><strong>Active Player</strong> - User starts making picks</li>
          </ol>
        </div>

        <!-- Footer -->
        <div style="text-align: center; border-top: 1px solid #e5e7eb; padding-top: 24px;">
          <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">Pool Growth Alert</p>
          <p style="color: #6b7280; margin: 0 0 16px 0;">Another player has joined the competition!</p>
          
          <div style="margin-top: 24px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">Best regards,<br>The Loser Pool Admin System</p>
          </div>
        </div>

        <!-- Contact Info -->
        <div style="text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">
            This is an automated notification from The Loser Pool admin system.<br>
            Manage notifications in your admin dashboard.
          </p>
        </div>
      </div>
    </div>
    `

    // Send to all admin users
    for (const admin of admins) {
      try {
        // Add delay between emails to respect rate limits (2 requests per second = 500ms delay)
        if (admins.indexOf(admin) > 0) {
          console.log(`⏳ Waiting 500ms before sending next admin signup notification (rate limit compliance)...`)
          await new Promise(resolve => setTimeout(resolve, 500))
        }

        await sendEmail({
          to: admin.email,
          subject,
          html: htmlBody,
          text: `New User Signup - ${signupData.firstName} ${signupData.lastName}\n\nUser: ${signupData.firstName} ${signupData.lastName}\nUsername: ${signupData.username}\nEmail: ${signupData.userEmail}\nSignup Time: ${signupData.signupTime}\nSignup ID: ${signupData.signupId}`
        })
        console.log(`Admin signup notification sent to: ${admin.email}`)
      } catch (error) {
        console.error(`Failed to send admin signup notification to ${admin.email}:`, error)
      }
    }

    console.log(`Admin signup notifications sent to ${admins.length} admin(s)`)
  } catch (error) {
    console.error('Error sending admin signup notifications:', error)
  }
}

interface SignupNotificationData {
  userEmail: string
  username: string
  firstName: string
  lastName: string
  signupTime: string
  signupId: string
} 