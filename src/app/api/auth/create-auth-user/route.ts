import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password, userId } = await request.json()
    
    console.log('🔄 Create auth user request:', { email, hasPassword: !!password, userId })
    
    if (!email || !password) {
      console.error('❌ Missing required fields:', { email: !!email, password: !!password })
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    console.log('🔄 Creating auth user for:', email)

    // First, check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      return NextResponse.json({ 
        error: 'Failed to check existing users',
        details: listError.message 
      }, { status: 500 })
    }

    const existingUser = existingUsers.users.find(user => user.email === email)
    
    if (existingUser) {
      console.log('⚠️ User already exists in auth system:', existingUser.id)
      return NextResponse.json({ 
        success: true,
        userId: existingUser.id,
        message: 'User already exists in auth system'
      })
    }

    console.log('✅ User does not exist, proceeding with creation...')

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
        details: createError.message,
        code: createError.status
      }, { status: 500 })
    }

    console.log('✅ Auth user created successfully:', authUser.user?.id)

    return NextResponse.json({ 
      success: true,
      userId: authUser.user?.id,
      message: 'Auth user created successfully'
    })

  } catch (error) {
    console.error('❌ Create auth user error:', error)
    return NextResponse.json({ 
      error: 'Failed to create auth user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
