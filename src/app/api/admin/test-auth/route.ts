import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'

export async function GET() {
  try {
    // Get current user using the same pattern as other routes
    const user = await getCurrentUser()
    
    console.log('Test Auth - User check:', { 
      userId: user?.id, 
      userEmail: user?.email
    })

    if (!user) {
      return NextResponse.json({ 
        authenticated: false, 
        error: 'No user found' 
      })
    }

    // Check if user is admin
    const supabase = await createServerSupabaseClient()
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('id, email, username, is_admin, user_type')
      .eq('id', user.id)
      .single()

    console.log('Test Auth - Profile check:', { 
      userProfile, 
      error: profileError 
    })

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: userProfile,
      isAdmin: userProfile?.is_admin || false,
      error: profileError?.message
    })

  } catch (error) {
    console.error('Test Auth - Error:', error)
    return NextResponse.json({ 
      authenticated: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
