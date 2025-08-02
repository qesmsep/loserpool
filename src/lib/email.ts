import { createServerSupabaseClient } from '@/lib/supabase-server'

interface PurchaseNotificationData {
  userEmail: string
  username: string
  picksCount: number
  amount: number
  purchaseId: string
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