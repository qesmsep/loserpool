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

    // Find user by email
    const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('❌ Error listing users:', listError)
      return NextResponse.json({ error: 'Failed to look up user', details: listError.message }, { status: 500 })
    }

    console.log('📋 Total users found:', list?.users?.length || 0)
    console.log('🔍 Looking for email:', email)
    
    // Log first few users for debugging
    if (list?.users && list.users.length > 0) {
      console.log('📋 First 3 users:', list.users.slice(0, 3).map(u => ({ id: u.id, email: u.email })))
    }

    const user = list?.users?.find(u => u.email === email)
    console.log('🔍 User found:', user ? `Yes (${user.id})` : 'No')

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: newPassword,
    })

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update password', details: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
