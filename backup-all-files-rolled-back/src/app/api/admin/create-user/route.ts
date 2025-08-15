import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!



export async function POST(request: NextRequest) {
  try {
    console.log('API route called')
    console.log('Supabase URL:', supabaseUrl)
    console.log('Service role key available:', !!supabaseServiceKey)
    console.log('Service role key length:', supabaseServiceKey?.length)
    
    // Check admin authentication
    const adminUser = await requireAdmin()
    console.log('Admin check passed:', adminUser?.email)
    
    const { email, username, first_name, last_name, phone, is_admin, temporaryPassword } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    if (!temporaryPassword) {
      return NextResponse.json({ error: 'Temporary password is required' }, { status: 400 })
    }

    console.log('Creating user with email:', email)

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

        // Create auth user using service role with provided temporary password
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: temporaryPassword,
          email_confirm: true
        })

        if (authError) {
          console.error('Auth error:', authError)
          throw authError
        }

        if (!authData.user) {
          throw new Error('Failed to create auth user')
        }

        console.log('Auth user created:', authData.user.id)

        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Update the user profile with admin-provided data and password change flag
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .update({
            username: username || null,
            first_name: first_name || null,
            last_name: last_name || null,
            phone: phone || null,
            is_admin: is_admin || false,
            needs_password_change: true // Add this flag
          })
          .eq('id', authData.user.id)
          .select()
          .single()

        if (userError) {
          console.error('User profile update error:', userError)
          throw userError
        }

        console.log('User profile updated successfully')
        return NextResponse.json({ 
          user,
          message: 'User created successfully with provided temporary password.'
        })
      } catch (serviceRoleError) {
        console.error('Service role approach failed:', serviceRoleError)
        // Fall back to manual approach
      }
    }

    // Fallback: Create user profile manually (without auth user)
    console.log('Using fallback approach - creating profile only')
    const supabase = await createServerSupabaseClient()
    
    // Generate a UUID for the user
    const userId = crypto.randomUUID()

    // Create user profile directly
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        username: username || null,
        first_name: first_name || null,
        last_name: last_name || null,
        phone: phone || null,
        is_admin: is_admin || false,
        needs_password_change: true
      })
      .select()
      .single()

    if (userError) {
      console.error('User profile creation error:', userError)
      return NextResponse.json({ error: userError.message }, { status: 400 })
    }

    console.log('User profile created successfully (fallback)')
    return NextResponse.json({ 
      user,
      message: 'User profile created. Note: Auth user will need to be created separately if login is required.'
    })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 