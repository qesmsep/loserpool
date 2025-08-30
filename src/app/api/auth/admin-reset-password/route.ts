import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json()
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing email or newPassword' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Emails are stored lowercase in Supabase
    const normalizedEmail = String(email).trim().toLowerCase()

    // Look up existing user (do NOT create)
    const { data: users, error: getErr } = await supabaseAdmin.auth.admin.listUsers()
    if (getErr) {
      return NextResponse.json({ error: 'Failed to look up user', details: getErr.message }, { status: 500 })
    }

    const user = users?.users?.find(u => u.email === normalizedEmail)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { error: updateErr } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password: newPassword })
    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update password', details: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
