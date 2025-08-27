import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userId } = await request.json()
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    console.log('🔄 Creating auth user for:', email)

    // Create the user in auth.users
    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        public_user_id: userId
      }
    })

    if (createError) {
      console.error('❌ Error creating auth user:', createError)
      return NextResponse.json({ 
        error: 'Failed to create auth user',
        details: createError.message 
      }, { status: 500 })
    }

    console.log('✅ Auth user created successfully:', authUser.user?.id)

    return NextResponse.json({ 
      success: true,
      userId: authUser.user?.id,
      message: 'Auth user created successfully'
    })

  } catch (error) {
    console.error('Create auth user error:', error)
    return NextResponse.json({ error: 'Failed to create auth user' }, { status: 500 })
  }
}
