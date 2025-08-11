import { createServerSupabaseClient } from './supabase-server'
import { sendEmail, getEmailConfigStatus } from './email-service'

export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  trigger_type: 'pick_reminder' | 'welcome' | 'elimination' | 'custom'
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
    '{{prize_pool}}': `$${(context.prize_pool / 100).toFixed(2)}`
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
    
    // Send email using the new email service
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
