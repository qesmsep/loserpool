import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json()
    
    console.log('🚀 FORCE password reset for:', email)
    
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 })
    }

    const supabaseAdmin = createServiceRoleClient()

    // Step 1: Try to find existing user
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('❌ Error listing users:', listError)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }

    const existingUser = users.users.find(u => u.email === email)
    
    if (existingUser) {
      console.log('✅ Found existing user, updating password...')
      
      // Update existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: newPassword }
      )

      if (updateError) {
        console.error('❌ Update failed, trying to create new user...')
        
        // If update fails, try to create new user
        const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: newPassword,
          email_confirm: true
        })

        if (createError) {
          console.error('❌ Create also failed:', createError)
          return NextResponse.json({ 
            error: 'Failed to reset password',
            details: createError.message 
          }, { status: 500 })
        }

        console.log('✅ Created new user with password')
        return NextResponse.json({ 
          success: true,
          message: 'Password reset successful (created new user)'
        })
      }

      console.log('✅ Updated existing user password')
      return NextResponse.json({ 
        success: true,
        message: 'Password reset successful (updated existing user)'
      })
    } else {
      console.log('⚠️ User not found, creating new user...')
      
      // Create new user
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true
      })

      if (createError) {
        console.error('❌ Create failed:', createError)
        return NextResponse.json({ 
          error: 'Failed to create user',
          details: createError.message 
        }, { status: 500 })
      }

      console.log('✅ Created new user with password')
      return NextResponse.json({ 
        success: true,
        message: 'Password reset successful (created new user)'
      })
    }

  } catch (error) {
    console.error('❌ Force password reset error:', error)
    return NextResponse.json({ 
      error: 'Password reset failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
