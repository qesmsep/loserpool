import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
)

export async function POST(req: Request) {
  try {
    const { email, newPassword } = await req.json()
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Missing email or newPassword' }, { status: 400 })
    }

    // Find user by email - handle pagination to get all users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allUsers: any[] = []
    let page = 1
    const perPage = 1000 // Get maximum users per page
    
    while (true) {
      const { data: list, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage
      })

      if (listError) {
        console.error('❌ Error listing users:', listError)
        return NextResponse.json({ error: 'Failed to look up user', details: listError.message }, { status: 500 })
      }

      if (!list?.users || list.users.length === 0) {
        break // No more users
      }

      allUsers = allUsers.concat(list.users)
      
      // If we got fewer users than requested, we've reached the end
      if (list.users.length < perPage) {
        break
      }
      
      page++
    }

    console.log('📋 Total users found:', allUsers.length)
    console.log('🔍 Looking for email:', email)
    
    // Log first few users for debugging
    if (allUsers.length > 0) {
      console.log('📋 First 3 users:', allUsers.slice(0, 3).map(u => ({ id: u.id, email: u.email })))
    }

    const user = allUsers.find(u => u.email === email)
    console.log('🔍 User found:', user ? `Yes (${user.id})` : 'No')

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    console.log('🔄 Attempting password update for user:', user.id)
    console.log('🔍 Password length:', newPassword.length)
    
    // Try updateUserById with more specific error handling
    const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    )

    if (updateError) {
      console.error('❌ Error updating password:', updateError)
      console.error('❌ Error details:', {
        userId: user.id,
        userEmail: user.email,
        errorMessage: updateError.message,
        errorStatus: updateError.status,
        errorCode: updateError.code,
        passwordLength: newPassword.length
      })
      return NextResponse.json({ error: 'Failed to update password', details: updateError.message }, { status: 500 })
    }

    console.log('✅ Password updated successfully for user:', user.id)
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unexpected error' }, { status: 500 })
  }
}
