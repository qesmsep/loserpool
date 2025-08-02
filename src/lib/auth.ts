import { createServerSupabaseClient } from './supabase'
import { redirect } from 'next/navigation'

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  const supabase = await createServerSupabaseClient()
  
  const { data: userProfile } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  
  if (!userProfile?.is_admin) {
    redirect('/dashboard')
  }
  
  return user
}

export async function getUserProfile(userId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  return profile
} 