import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const email = 'tim@828.life'
    const supabaseAdmin = createServiceRoleClient()

    // Test 1: Check if user exists in auth.users
    console.log('🔍 Testing password reset for:', email)
    
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      return NextResponse.json({ 
        error: 'Failed to list users',
        details: listError.message 
      }, { status: 500 })
    }

    const authUser = users.users.find(u => u.email === email)
    
    if (authUser) {
      return NextResponse.json({ 
        success: true,
        message: 'User exists in auth.users - password reset will work',
        user: {
          id: authUser.id,
          email: authUser.email,
          email_confirmed_at: authUser.email_confirmed_at
        }
      })
    } else {
      return NextResponse.json({ 
        success: true,
        message: 'User not found in auth.users - will be created during reset',
        willCreate: true
      })
    }

  } catch (error) {
    console.error('Test password reset error:', error)
    return NextResponse.json({ 
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
