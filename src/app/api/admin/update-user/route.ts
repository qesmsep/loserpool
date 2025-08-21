import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()
    
    // Create service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()
    
    const { userId, updateData } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    if (!updateData || typeof updateData !== 'object') {
      return NextResponse.json({ error: 'Update data is required' }, { status: 400 })
    }
    
    console.log('Updating user:', userId, 'with data:', updateData)
    
    // First, let's check if the user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching existing user:', fetchError)
      return NextResponse.json({ error: `User not found: ${fetchError.message}` }, { status: 404 })
    }
    
    console.log('Existing user data:', existingUser)
    console.log('About to update with data:', updateData)
    
    // Check if transitioning from tester to active and calculate new default_week
    const finalUpdateData = { ...updateData }
    if (existingUser.user_type === 'tester' && updateData.user_type === 'active') {
      // Calculate what the new default week should be for an active user
      const { data: currentWeekSetting } = await supabaseAdmin
        .from('global_settings')
        .select('value')
        .eq('key', 'current_week')
        .single()
      
      const currentWeek = currentWeekSetting ? parseInt(currentWeekSetting.value) : 1
      finalUpdateData.default_week = currentWeek
      console.log('Transitioning from tester to active - setting default_week to current week:', currentWeek)
    }
    
    // Update the user using service role client
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(finalUpdateData)
      .eq('id', userId)
      .select()
    
    console.log('Update result - data:', data, 'error:', error)
    
    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      user: data?.[0],
      message: 'User updated successfully' 
    })
    
  } catch (error) {
    console.error('Error in update-user API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
