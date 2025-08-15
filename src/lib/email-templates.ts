import { createServerSupabaseClient } from './supabase-server'
import { sendEmail, getEmailConfigStatus } from './email-service'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  trigger_type: 'pick_reminder' | 'welcome' | 'elimination' | 'signup_confirmation' | 'custom'
  timing: 'immediately' | 'morning_before_first_game' | 'day_before' | 'custom'
  custom_timing?: string
  is_active: boolean
}

export interface UserData {
  id: string
  email: string
  first_name: string | null
  username: string | null
  picks_remaining: number
  is_eliminated: boolean
  leaderboard_position?: number
}

export interface TemplateContext {
  user: UserData
  week_number: number
  picks_deadline: string
  pool_name: string
  admin_name: string
  total_players: number
  prize_pool: number
  elimination_reason?: string
  game_details?: string
  confirmation_link?: string
}

export async function getEmailTemplates(triggerType?: string): Promise<EmailTemplate[]> {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('email_templates')
    .select('*')
    .eq('is_active', true)
  
  if (triggerType) {
    query = query.eq('trigger_type', triggerType)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching email templates:', error)
    return []
  }
  
  return data || []
}

export function processTemplate(template: EmailTemplate, context: TemplateContext): { subject: string; body: string } {
  let subject = template.subject
  let body = template.body
  
  // Replace all proximity variables
  const variables = {
    '{{user_name}}': context.user.first_name || context.user.username || 'there',
    '{{user_email}}': context.user.email,
    '{{week_number}}': context.week_number.toString(),
    '{{picks_deadline}}': context.picks_deadline,
    '{{picks_remaining}}': context.user.picks_remaining.toString(),
    '{{pool_name}}': context.pool_name,
    '{{admin_name}}': context.admin_name,
    '{{elimination_reason}}': context.elimination_reason || 'Your pick won instead of losing',
    '{{game_details}}': context.game_details || 'Game details not available',
    '{{leaderboard_position}}': context.user.leaderboard_position?.toString() || 'N/A',
    '{{total_players}}': context.total_players.toString(),
    '{{prize_pool}}': `$${(context.prize_pool / 100).toFixed(2)}`,
    '{{confirmation_link}}': context.confirmation_link || '[Confirmation link not available]'
  }
  
  // Replace variables in subject and body
  Object.entries(variables).forEach(([variable, value]) => {
    const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    subject = subject.replace(regex, value)
    body = body.replace(regex, value)
  })
  
  return { subject, body }
}

export async function sendTemplateEmail(template: EmailTemplate, context: TemplateContext): Promise<boolean> {
  try {
    const { subject, body } = processTemplate(template, context)
    
    // Get email configuration status for debugging
    const configStatus = getEmailConfigStatus()
    console.log('🔍 Email Config Status:', configStatus)
    
    // Check if this is a signup confirmation email and use built-in template if available
    if (template.trigger_type === 'signup_confirmation') {
      const builtInTemplate = emailTemplates['signup-confirmation']
      if (builtInTemplate) {
        const processedSubject = processTemplateVariables(builtInTemplate.subject, context)
        const processedHtml = processTemplateVariables(builtInTemplate.html, context)
        const processedText = processTemplateVariables(builtInTemplate.text, context)
        
        // Send email using the built-in template
        const result = await sendEmail({
          to: context.user.email,
          subject: processedSubject,
          html: processedHtml,
          text: processedText,
          from: configStatus.fromEmail
        })
        
        if (result.success) {
          console.log(`✅ Built-in signup confirmation email sent successfully to ${context.user.email}`)
          console.log(`📧 Provider: ${result.provider}, ID: ${result.emailId}`)
          return true
        } else {
          console.error(`❌ Failed to send built-in signup confirmation email to ${context.user.email}:`, result.error)
          return false
        }
      }
    }
    
    // Fallback to database template
    const result = await sendEmail({
      to: context.user.email,
      subject,
      html: body.replace(/\n/g, '<br>'),
      text: body,
      from: configStatus.fromEmail
    })
    
    if (result.success) {
      console.log(`✅ Email sent successfully to ${context.user.email}: ${subject}`)
      console.log(`📧 Provider: ${result.provider}, ID: ${result.emailId}`)
      return true
    } else {
      console.error(`❌ Failed to send email to ${context.user.email}:`, result.error)
      return false
    }
  } catch (error) {
    console.error('❌ Error sending template email:', error)
    return false
  }
}

// Helper function to process template variables for built-in templates
function processTemplateVariables(template: string, context: TemplateContext): string {
  const variables = {
    '{{user_name}}': context.user.first_name || context.user.username || 'there',
    '{{user_email}}': context.user.email,
    '{{week_number}}': context.week_number.toString(),
    '{{picks_deadline}}': context.picks_deadline,
    '{{picks_remaining}}': context.user.picks_remaining.toString(),
    '{{pool_name}}': context.pool_name,
    '{{admin_name}}': context.admin_name,
    '{{elimination_reason}}': context.elimination_reason || 'Your pick won instead of losing',
    '{{game_details}}': context.game_details || 'Game details not available',
    '{{leaderboard_position}}': context.user.leaderboard_position?.toString() || 'N/A',
    '{{total_players}}': context.total_players.toString(),
    '{{prize_pool}}': `$${(context.prize_pool / 100).toFixed(2)}`,
    '{{confirmation_link}}': context.confirmation_link || '[Confirmation link not available]'
  }
  
  // Replace variables in template
  let processedTemplate = template
  Object.entries(variables).forEach(([variable, value]) => {
    const regex = new RegExp(variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
    processedTemplate = processedTemplate.replace(regex, value)
  })
  
  return processedTemplate
}

export async function sendPickReminders(): Promise<{ success: number; failed: number }> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get pick reminder templates
    const templates = await getEmailTemplates('pick_reminder')
    if (templates.length === 0) {
      console.log('No active pick reminder templates found')
      return { success: 0, failed: 0 }
    }
    
    // Get current week and deadline
    const { data: weekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()
    
    const currentWeek = weekSetting ? parseInt(weekSetting.value) : 1
    
    // Get all active users who haven't been eliminated
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, username')
      .eq('is_admin', false)
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return { success: 0, failed: 0 }
    }
    
    // Get pool stats
    const { data: purchases } = await supabase
      .from('purchases')
      .select('amount_paid')
      .eq('status', 'completed')
    
    const totalPlayers = users?.length || 0
    const prizePool = purchases?.reduce((sum, p) => sum + p.amount_paid, 0) || 0
    
    // Get admin name
    const { data: adminUser } = await supabase
      .from('users')
      .select('first_name, username')
      .eq('is_admin', true)
      .limit(1)
      .single()
    
    const adminName = adminUser?.first_name || adminUser?.username || 'Admin'
    
    let successCount = 0
    let failedCount = 0
    
    // Send emails to each user
    for (const user of users || []) {
      // Get user's picks for current week
      const { data: userPicks } = await supabase
        .from('picks')
        .select('picks_count')
        .eq('user_id', user.id)
        .eq('week', currentWeek)
      
      const picksUsed = userPicks?.reduce((sum, pick) => sum + pick.picks_count, 0) || 0
      const picksRemaining = 10 - picksUsed // Assuming 10 picks per user
      
      // Calculate deadline (simplified - you might want to get this from matchups)
      const deadline = new Date()
      deadline.setDate(deadline.getDate() + 1) // Tomorrow
      deadline.setHours(14, 0, 0, 0) // 2 PM
      
      const context: TemplateContext = {
        user: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          username: user.username,
          picks_remaining: picksRemaining,
          is_eliminated: false
        },
        week_number: currentWeek,
        picks_deadline: deadline.toLocaleString(),
        pool_name: 'The Loser Pool',
        admin_name: adminName,
        total_players: totalPlayers,
        prize_pool: prizePool
      }
      
      // Send email using the first template (you might want to send all active ones)
      const template = templates[0]
      const success = await sendTemplateEmail(template, context)
      
      if (success) {
        successCount++
      } else {
        failedCount++
      }
    }
    
    console.log(`Pick reminders sent: ${successCount} success, ${failedCount} failed`)
    return { success: successCount, failed: failedCount }
    
  } catch (error) {
    console.error('Error sending pick reminders:', error)
    return { success: 0, failed: 0 }
  }
}

export async function sendWelcomeEmail(userId: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get welcome templates
    const templates = await getEmailTemplates('welcome')
    if (templates.length === 0) {
      console.log('No active welcome templates found')
      return false
    }
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, username')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return false
    }
    
    // Get admin name
    const { data: adminUser } = await supabase
      .from('users')
      .select('first_name, username')
      .eq('is_admin', true)
      .limit(1)
      .single()
    
    const adminName = adminUser?.first_name || adminUser?.username || 'Admin'
    
    const context: TemplateContext = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        username: user.username,
        picks_remaining: 10, // New users start with 10 picks
        is_eliminated: false
      },
      week_number: 1,
      picks_deadline: 'TBD',
      pool_name: 'The Loser Pool',
      admin_name: adminName,
      total_players: 1,
      prize_pool: 0
    }
    
    // Send email using the first template
    const template = templates[0]
    return await sendTemplateEmail(template, context)
    
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return false
  }
}

export async function sendSignupConfirmationEmail(userId: string, confirmationLink: string): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  try {
    // Get signup confirmation templates
    const templates = await getEmailTemplates('signup_confirmation')
    if (templates.length === 0) {
      console.log('No active signup confirmation templates found')
      return false
    }
    
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, username')
      .eq('id', userId)
      .single()
    
    if (userError || !user) {
      console.error('Error fetching user:', userError)
      return false
    }
    
    // Get admin name
    const { data: adminUser } = await supabase
      .from('users')
      .select('first_name, username')
      .eq('is_admin', true)
      .limit(1)
      .single()
    
    const adminName = adminUser?.first_name || adminUser?.username || 'Admin'
    
    const context: TemplateContext = {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        username: user.username,
        picks_remaining: 10, // New users start with 10 picks
        is_eliminated: false
      },
      week_number: 1,
      picks_deadline: 'TBD',
      pool_name: 'The Loser Pool',
      admin_name: adminName,
      total_players: 1,
      prize_pool: 0,
      confirmation_link: confirmationLink
    }
    
    // Send email using the first template
    const template = templates[0]
    return await sendTemplateEmail(template, context)
    
  } catch (error) {
    console.error('Error sending signup confirmation email:', error)
    return false
  }
}

export const emailTemplates = {
  'error-notification': {
    subject: 'Loser Pool - Automated Update Error',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Automated Update Error</h2>
        
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #dc2626; margin-top: 0;">Error Details</h3>
          <p style="margin: 8px 0;"><strong>Error:</strong> {{error}}</p>
          <p style="margin: 8px 0;"><strong>Timestamp:</strong> {{timestamp}}</p>
          <p style="margin: 8px 0;"><strong>Environment:</strong> {{environment}}</p>
        </div>
        
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #0369a1; margin-top: 0;">What This Means</h3>
          <p>The automated matchup update system encountered an error while trying to fetch and update game data from external APIs.</p>
          <p>This may affect the real-time display of game information, weather data, or odds in the Loser Pool application.</p>
        </div>
        
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <h3 style="color: #166534; margin-top: 0;">Next Steps</h3>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>Check the application logs for more detailed error information</li>
            <li>Verify API keys and external service availability</li>
            <li>Consider running a manual update to test the system</li>
            <li>Review the admin dashboard for update status</li>
          </ul>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          This is an automated notification from the Loser Pool system. 
          Please investigate the issue to ensure continued functionality.
        </p>
      </div>
    `,
    text: `
Automated Update Error

Error Details:
- Error: {{error}}
- Timestamp: {{timestamp}}
- Environment: {{environment}}

What This Means:
The automated matchup update system encountered an error while trying to fetch and update game data from external APIs. This may affect the real-time display of game information, weather data, or odds in the Loser Pool application.

Next Steps:
- Check the application logs for more detailed error information
- Verify API keys and external service availability
- Consider running a manual update to test the system
- Review the admin dashboard for update status

This is an automated notification from the Loser Pool system. Please investigate the issue to ensure continued functionality.
    `
  },
  'signup-confirmation': {
    subject: '🎉 Welcome to The Loser Pool! Confirm Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 20px;">
        <div style="background-color: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #1e40af; font-size: 28px; margin: 0 0 8px 0;">🎉 Welcome to The Loser Pool!</h1>
            <p style="color: #6b7280; font-size: 16px; margin: 0;">You've just joined the most exciting NFL elimination pool around!</p>
          </div>

          <!-- Welcome Message -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <h2 style="margin: 0 0 16px 0; font-size: 20px;">🏈 What is The Loser Pool?</h2>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Pick teams that you think will <strong>LOSE</strong> each week</li>
              <li>If your pick wins, you're eliminated from that pick</li>
              <li>Last person standing wins the entire pool!</li>
              <li>It's simple, exciting, and anyone can win!</li>
            </ul>
          </div>

          <!-- Next Steps -->
          <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #0369a1; margin: 0 0 16px 0;">🚀 What happens next?</h3>
            <ol style="margin: 0; padding-left: 20px; line-height: 1.6; color: #1e40af;">
              <li><strong>Confirm your email</strong> by clicking the button below</li>
              <li><strong>Log into your account</strong> and explore your dashboard</li>
              <li><strong>Purchase picks</strong> to get started (you get 10 picks to start!)</li>
              <li><strong>Make your first picks</strong> for the upcoming week</li>
              <li><strong>Watch the games</strong> and hope your picks lose!</li>
            </ol>
          </div>

          <!-- Important Notice -->
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">⏰ Important: You need to confirm your email before you can start playing.</p>
          </div>

          <!-- Confirmation Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="{{confirmation_link}}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
              🔗 Confirm Your Email & Get Started
            </a>
          </div>

          <!-- Fallback Link -->
          <div style="text-align: center; margin-bottom: 24px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">If the button doesn't work, copy and paste this link:</p>
            <p style="background-color: #f3f4f6; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 12px; word-break: break-all; margin: 0;">
              {{confirmation_link}}
            </p>
          </div>

          <!-- Quick Tips -->
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="color: #166534; margin: 0 0 16px 0;">🎯 Quick Tips</h3>
            <ul style="margin: 0; padding-left: 20px; line-height: 1.6; color: #166534;">
              <li>Check your spam folder if you don't see this email</li>
              <li>Make sure to confirm your email within 24 hours</li>
              <li>Once confirmed, you can log in and start playing immediately</li>
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
            <p style="color: #1e40af; font-size: 18px; font-weight: 600; margin: 0 0 8px 0;">We can't wait to see you in action!</p>
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
    `,
    text: `
Hi {{user_name}}!

🎉 Welcome to The Loser Pool! 🎉

You've just joined the most exciting NFL elimination pool around! We're thrilled to have you on board.

🏈 What is The Loser Pool?
- Pick teams that you think will LOSE each week
- If your pick wins, you're eliminated from that pick
- Last person standing wins the entire pool!
- It's simple, exciting, and anyone can win!

🚀 What happens next?
1. Confirm your email by clicking the link below
2. Log into your account and explore your dashboard
3. Purchase picks to get started (you get 10 picks to start!)
4. Make your first picks for the upcoming week
5. Watch the games and hope your picks lose!

⏰ Important: You need to confirm your email before you can start playing.

🔗 Ready to get started?
Click this link to confirm your email and activate your account:
{{confirmation_link}}

🎯 Quick Tips:
- Check your spam folder if you don't see this email
- Make sure to confirm your email within 24 hours
- Once confirmed, you can log in and start playing immediately

🏆 Pool Highlights:
- Weekly elimination format
- Real-time leaderboards
- Mobile-friendly interface
- Fair and transparent rules
- Exciting prizes for winners

We can't wait to see you in action! Good luck, and remember - you're picking teams to LOSE!

Best regards,
The Loser Pool Team

---
Questions? Reply to this email or contact us at support@loserpool.com
Follow us on social media for updates and announcements!
    `
  }
}
