import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth'

export async function POST() {
  try {
    const user = await requireAuth()
    const supabase = await createServerSupabaseClient()

    // Check if user profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      return NextResponse.json({ message: 'Profile already exists' })
    }

    // Create user profile
    const { data: profile, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email!,
        username: null,
        is_admin: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create user profile:', error, JSON.stringify(error));
      return NextResponse.json(
        { error: 'Failed to create user profile', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Create profile error:', error, JSON.stringify(error))
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
} 