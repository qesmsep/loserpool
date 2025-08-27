import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🧪 Testing password update for:', email)
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // First, let's check what users exist
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message 
      }, { status: 500 })
    }

    console.log('🔍 Found', users.users.length, 'users in auth system')
    
    const user = users.users.find(u => u.email === email)
    
    if (!user) {
      console.log('❌ User not found in auth system, attempting to create...')
      
      // Try to create the user in auth system
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createError) {
        console.error('❌ Error creating user:', createError)
        return NextResponse.json({ 
          error: 'Failed to create user in auth system',
          details: createError.message,
          code: createError.status
        }, { status: 500 })
      }

      console.log('✅ User created successfully in auth system')
      return NextResponse.json({ 
        success: true,
        message: 'User created with password successfully',
        user: {
          id: createData.user?.id,
          email: createData.user?.email
        }
      })
    }

    console.log('✅ Found user:', {
      id: user.id,
      email: user.email,
      emailConfirmed: user.email_confirmed_at,
      createdAt: user.created_at,
      lastSignIn: user.last_sign_in_at
    })

    // Try updating the password
    console.log('🔄 Attempting password update...')
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password }
    )

    if (updateError) {
      console.error('❌ Password update error:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update password',
        details: updateError.message,
        code: updateError.status
      }, { status: 500 })
    }

    console.log('✅ Password updated successfully')
    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully',
      user: {
        id: updateData.user?.id,
        email: updateData.user?.email
      }
    })

  } catch (error) {
    console.error('❌ Test password update error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
