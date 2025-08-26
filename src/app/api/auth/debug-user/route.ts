import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    console.log('🔍 Debugging user lookup for:', email)

    // Check in auth.users table
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    console.log('🔍 Auth users count:', authUsers?.users?.length || 0)
    
    const authUser = authUsers?.users?.find(u => u.email === email)
    console.log('🔍 Auth user found:', !!authUser)

    // Check in public.users table
    const { data: publicUser, error: publicError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    console.log('🔍 Public user found:', !!publicUser)
    console.log('🔍 Public user error:', publicError)

    return NextResponse.json({ 
      success: true,
      email,
      authUser: authUser ? {
        id: authUser.id,
        email: authUser.email,
        created_at: authUser.created_at
      } : null,
      publicUser: publicUser ? {
        id: publicUser.id,
        email: publicUser.email,
        created_at: publicUser.created_at
      } : null,
      authError: authError?.message,
      publicError: publicError?.message
    })

  } catch (error) {
    console.error('Debug user error:', error)
    return NextResponse.json({ error: 'Debug failed' }, { status: 500 })
  }
}
