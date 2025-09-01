import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [UPDATE-PASSWORD-DIRECT] Starting direct password update')
  
  try {
    const { email, newPassword } = await request.json()
    
    if (!email || !newPassword) {
      console.log('❌ [UPDATE-PASSWORD-DIRECT] Missing email or password')
      return NextResponse.json({ 
        error: 'Email and new password are required' 
      }, { status: 400 })
    }

    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // Find the user by email - handle pagination
    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Finding user by email...')
    let authUser = null
    let page = 0
    const perPage = 1000
    
    while (!authUser) {
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      })
      
      if (listError) {
        console.error('❌ [UPDATE-PASSWORD-DIRECT] Failed to list users:', listError)
        return NextResponse.json({ 
          error: 'Failed to find user',
          details: listError.message
        }, { status: 500 })
      }
      
      if (!users || users.length === 0) {
        console.log('❌ [UPDATE-PASSWORD-DIRECT] No more users found, user not in system')
        break
      }
      
      authUser = users.find(user => user.email === email)
      
      if (!authUser) {
        page++
        console.log(`🔍 [UPDATE-PASSWORD-DIRECT] User not found on page ${page-1}, checking page ${page}...`)
      }
    }
    
    if (!authUser) {
      console.log('❌ [UPDATE-PASSWORD-DIRECT] User not found:', email)
      return NextResponse.json({ 
        error: 'User not found',
        email: email
      }, { status: 404 })
    }
    
    console.log('✅ [UPDATE-PASSWORD-DIRECT] User found:', authUser.id)
    
    // Update the password directly using admin API
    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Updating password...')
    
        // Try using the admin API with minimal data
    console.log('🔧 [UPDATE-PASSWORD-DIRECT] Attempting password update with admin API...')
    
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    )
    
    if (updateError) {
      console.error('❌ [UPDATE-PASSWORD-DIRECT] Admin API password update failed:', updateError)
      
      // Since the admin API is failing due to auth_audit_log, let's try a different approach
      // Let's create a simple SQL function to update the password directly
      console.log('🔧 [UPDATE-PASSWORD-DIRECT] Trying SQL function approach...')
      
      try {
        // Create a simple SQL function to update password
        const { error: createFunctionError } = await supabaseAdmin.rpc('create_password_update_function', {})
        
        if (createFunctionError) {
          console.log('🔧 [UPDATE-PASSWORD-DIRECT] Function might already exist, trying to use it...')
        }
        
        // Try to call the function
        const { data: functionResult, error: functionError } = await supabaseAdmin.rpc('update_user_password_direct', {
          user_id: authUser.id,
          new_password: newPassword
        })
        
        if (functionError) {
          console.error('❌ [UPDATE-PASSWORD-DIRECT] SQL function also failed:', functionError)
          return NextResponse.json({
            success: false,
            error: 'Password update failed',
            details: `Both admin API and SQL function failed: ${updateError.message}, Function: ${functionError.message}`,
            code: updateError.code,
            status: updateError.status
          })
        } else {
          console.log('✅ [UPDATE-PASSWORD-DIRECT] SQL function update succeeded')
        }
      } catch (functionException) {
        console.error('❌ [UPDATE-PASSWORD-DIRECT] SQL function exception:', functionException)
        return NextResponse.json({
          success: false,
          error: 'Password update failed',
          details: `Both admin API and SQL function failed: ${updateError.message}, Function exception: ${functionException}`,
          code: updateError.code,
          status: updateError.status
        })
      }
    } else {
      console.log('✅ [UPDATE-PASSWORD-DIRECT] Admin API password update succeeded')
    }
    
    console.log('✅ [UPDATE-PASSWORD-DIRECT] Password updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Password updated successfully',
      user: {
        id: authUser.id,
        email: authUser.email
      }
    })

  } catch (error) {
    console.error('❌ [UPDATE-PASSWORD-DIRECT] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
