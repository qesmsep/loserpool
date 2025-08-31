import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [UPDATE-PASSWORD-API] Starting password update request')
  
  try {
    const { password, userId } = await request.json()
    
    if (!password || !userId) {
      console.log('❌ [UPDATE-PASSWORD-API] Missing required fields')
      return NextResponse.json({ 
        error: 'Password and user ID are required' 
      }, { status: 400 })
    }

    console.log('🔧 [UPDATE-PASSWORD-API] Validating password...')
    
    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters long' 
      }, { status: 400 })
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one lowercase letter' 
      }, { status: 400 })
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one uppercase letter' 
      }, { status: 400 })
    }
    
    if (!/(?=.*\d)/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one number' 
      }, { status: 400 })
    }
    
    if (!/(?=.*[!@#$%^&*])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one special character (!@#$%^&*)' 
      }, { status: 400 })
    }

    console.log('✅ [UPDATE-PASSWORD-API] Password validation passed')
    console.log('🔧 [UPDATE-PASSWORD-API] Creating Supabase admin client...')
    
    const supabaseAdmin = createServiceRoleClient()
    
    console.log('🔧 [UPDATE-PASSWORD-API] Updating user password via admin API...')
    
    // Use admin API to update password
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    )

    if (error) {
      console.error('❌ [UPDATE-PASSWORD-API] Password update failed:', error)
      return NextResponse.json({ 
        error: error.message || 'Failed to update password' 
      }, { status: 500 })
    }

    console.log('✅ [UPDATE-PASSWORD-API] Password updated successfully for user:', data.user?.email)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Password updated successfully' 
    })

  } catch (error) {
    console.error('❌ [UPDATE-PASSWORD-API] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
