import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    console.log('🔄 Admin password update request for:', email)
    
    if (!email || !password) {
      console.error('❌ Missing required fields:', { email: !!email, password: !!password })
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // First, try to find the user by email
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message 
      }, { status: 500 })
    }

    const user = users.users.find(u => u.email === email)
    
    if (user) {
      console.log('✅ Found existing user, updating password...')
      
      // Update existing user's password
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password }
      )

      if (updateError) {
        console.error('❌ Error updating password:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update password',
          details: updateError.message 
        }, { status: 500 })
      }

      console.log('✅ Password updated successfully for existing user')
      return NextResponse.json({ 
        success: true,
        message: 'Password updated successfully'
      })
    } else {
      console.log('⚠️ User not found in auth system, creating new user...')
      
      // Create new user with the password
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (createError) {
        console.error('❌ Error creating user:', createError)
        return NextResponse.json({ 
          error: 'Failed to create user',
          details: createError.message 
        }, { status: 500 })
      }

      console.log('✅ New user created with password')
      return NextResponse.json({ 
        success: true,
        message: 'User created with password successfully'
      })
    }

  } catch (error) {
    console.error('❌ Admin password update error:', error)
    return NextResponse.json({ 
      error: 'Failed to update password',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
