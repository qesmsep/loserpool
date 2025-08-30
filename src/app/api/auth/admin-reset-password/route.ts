import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json()
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing email or newPassword' }, { status: 400 })
    }

    // Find user by email (DO NOT create)
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      email
    } as any)

    if (listError) {
      return NextResponse.json({ error: 'Failed to look up user', details: listError.message }, { status: 500 })
    }

    const user = list?.users?.[0]
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}
