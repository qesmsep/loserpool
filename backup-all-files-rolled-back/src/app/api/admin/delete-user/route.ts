import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication
    await requireAdmin()
    
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    console.log('Deleting user:', userId)

    // Try service role approach first
    if (supabaseServiceKey) {
      try {
        // Create service role client for admin operations
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        })

        // Delete from auth.users using service role
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
          console.error('Auth delete error:', authError)
          // If auth delete fails, we'll still try to delete the profile
        } else {
          console.log('Auth user deleted successfully')
        }

        // Delete from public.users (this should cascade to related records)
        const { error: profileError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', userId)

        if (profileError) {
          console.error('Profile delete error:', profileError)
          throw profileError
        }

        console.log('User profile deleted successfully')
        return NextResponse.json({ message: 'User deleted successfully' })
      } catch (serviceRoleError) {
        console.error('Service role approach failed:', serviceRoleError)
        // Fall back to manual approach
      }
    }

    // Fallback: Try to delete profile only
    console.log('Using fallback approach - deleting profile only')
    const { createServerSupabaseClient } = await import('@/lib/supabase-server')
    const supabase = await createServerSupabaseClient()
    
    const { error: profileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileError) {
      console.error('Profile deletion error:', profileError)
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    console.log('User profile deleted successfully (fallback)')
    return NextResponse.json({ 
      message: 'User profile deleted. Note: Auth user may need to be deleted separately.'
    })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 