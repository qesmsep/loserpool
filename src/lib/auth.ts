import { createServerSupabaseClient } from './supabase-server'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  try {
    const supabase = await createServerSupabaseClient()
    
    // First check if we have a session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('Session check:', { hasSession: !!session, sessionError })
    
    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('User check:', { hasUser: !!user, error })
    
    if (error) {
      console.error('Auth error:', error.message || error)
      return null
    }
    
    if (!user) {
      console.log('No user found')
      return null
    }
    
    console.log('User authenticated:', user.email)
    return user
  } catch (err) {
    console.error('getCurrentUser error:', err instanceof Error ? err.message : err)
    return null
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    console.log('No user found, redirecting to login')
    redirect('/login')
  }
  
  console.log('User authenticated:', user.email)
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()
  
  // Temporarily disable RLS check for admin verification
  // We'll handle admin checks in application code instead
  const { data: userProfile, error } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  
  if (error) {
    console.error('Admin check error:', error)
    // If we can't check admin status due to RLS, redirect to dashboard
    redirect('/dashboard')
  }
  
  if (!userProfile?.is_admin) {
    console.log('User is not admin, redirecting to dashboard')
    redirect('/dashboard')
  }
  
  return user
}

export async function getUserProfile(userId: string) {
  try {
    const supabase = await createServerSupabaseClient()
    
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) {
      console.error('getUserProfile error:', error)
      return null
    }
    
    return profile
  } catch (err) {
    console.error('getUserProfile error:', err)
    return null
  }
} 