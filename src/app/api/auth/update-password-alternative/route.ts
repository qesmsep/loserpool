import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: Request) {
  console.log('🔧 [UPDATE-PASSWORD-ALTERNATIVE] Starting alternative password update')
  
  try {
    const { password, userId } = await request.json()
    
    if (!password || !userId) {
      console.log('❌ [UPDATE-PASSWORD-ALTERNATIVE] Missing required fields')
      return NextResponse.json({ 
        error: 'Password and user ID are required' 
      }, { status: 400 })
    }

    console.log('🔧 [UPDATE-PASSWORD-ALTERNATIVE] Creating Supabase admin client...')
    const supabaseAdmin = createServiceRoleClient()
    
    // First, get the user details
    console.log('🔧 [UPDATE-PASSWORD-ALTERNATIVE] Getting user details...')
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
    
    if (userError) {
      console.error('❌ [UPDATE-PASSWORD-ALTERNATIVE] Failed to get user details:', userError)
      return NextResponse.json({ 
        error: 'Failed to get user details',
        details: userError.message
      }, { status: 500 })
    }
    
    console.log('✅ [UPDATE-PASSWORD-ALTERNATIVE] User details retrieved:', {
      id: userData.user?.id,
      email: userData.user?.email,
      emailConfirmed: !!userData.user?.email_confirmed_at,
      provider: userData.user?.app_metadata?.provider
    })
    
    // Try alternative approach: Update user with minimal data
    console.log('🔧 [UPDATE-PASSWORD-ALTERNATIVE] Attempting minimal password update...')
    
    // Approach 1: Just password, no metadata
    const { data: updateData1, error: updateError1 } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: password }
    )
    
    if (!updateError1) {
      console.log('✅ [UPDATE-PASSWORD-ALTERNATIVE] Approach 1 succeeded!')
      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully (approach 1)',
        user: {
          email: updateData1.user?.email,
          updatedAt: updateData1.user?.updated_at
        }
      })
    }
    
    console.log('❌ [UPDATE-PASSWORD-ALTERNATIVE] Approach 1 failed:', updateError1)
    
    // Approach 2: Try with different password format
    console.log('🔧 [UPDATE-PASSWORD-ALTERNATIVE] Attempting approach 2...')
    const { data: updateData2, error: updateError2 } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: password,
        app_metadata: {
          ...userData.user?.app_metadata,
          password_updated_at: new Date().toISOString()
        }
      }
    )
    
    if (!updateError2) {
      console.log('✅ [UPDATE-PASSWORD-ALTERNATIVE] Approach 2 succeeded!')
      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully (approach 2)',
        user: {
          email: updateData2.user?.email,
          updatedAt: updateData2.user?.updated_at
        }
      })
    }
    
    console.log('❌ [UPDATE-PASSWORD-ALTERNATIVE] Approach 2 failed:', updateError2)
    
    // Approach 3: Try with user_metadata only
    console.log('🔧 [UPDATE-PASSWORD-ALTERNATIVE] Attempting approach 3...')
    const { data: updateData3, error: updateError3 } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: password,
        user_metadata: {
          ...userData.user?.user_metadata,
          password_updated_at: new Date().toISOString()
        }
      }
    )
    
    if (!updateError3) {
      console.log('✅ [UPDATE-PASSWORD-ALTERNATIVE] Approach 3 succeeded!')
      return NextResponse.json({ 
        success: true, 
        message: 'Password updated successfully (approach 3)',
        user: {
          email: updateData3.user?.email,
          updatedAt: updateData3.user?.updated_at
        }
      })
    }
    
    console.log('❌ [UPDATE-PASSWORD-ALTERNATIVE] Approach 3 failed:', updateError3)
    
    // All approaches failed
    console.error('❌ [UPDATE-PASSWORD-ALTERNATIVE] All password update approaches failed')
    console.error('❌ [UPDATE-PASSWORD-ALTERNATIVE] Error details:', {
      approach1: updateError1?.message,
      approach2: updateError2?.message,
      approach3: updateError3?.message
    })
    
    return NextResponse.json({ 
      error: 'All password update approaches failed',
      details: {
        approach1: updateError1?.message,
        approach2: updateError2?.message,
        approach3: updateError3?.message
      },
      recommendations: [
        'This appears to be a Supabase project configuration issue',
        'Check your Supabase project settings in the dashboard',
        'Verify that password updates are allowed for your project',
        'Contact Supabase support if the issue persists'
      ]
    }, { status: 500 })

  } catch (error) {
    console.error('❌ [UPDATE-PASSWORD-ALTERNATIVE] Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
