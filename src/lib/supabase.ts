import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          username: string | null
          is_admin: boolean
          invited_by: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          username?: string | null
          is_admin?: boolean
          invited_by?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          username?: string | null
          is_admin?: boolean
          invited_by?: string | null
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          stripe_session_id: string
          amount: number
          picks_count: number
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_session_id: string
          amount: number
          picks_count: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_session_id?: string
          amount?: number
          picks_count?: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
      }
      matchups: {
        Row: {
          id: string
          week: number
          away_team: string
          home_team: string
          game_time: string
          away_score: number | null
          home_score: number | null
          status: 'scheduled' | 'live' | 'final'
          created_at: string
        }
        Insert: {
          id?: string
          week: number
          away_team: string
          home_team: string
          game_time: string
          away_score?: number | null
          home_score?: number | null
          status?: 'scheduled' | 'live' | 'final'
          created_at?: string
        }
        Update: {
          id?: string
          week?: number
          away_team?: string
          home_team?: string
          game_time?: string
          away_score?: number | null
          home_score?: number | null
          status?: 'scheduled' | 'live' | 'final'
          created_at?: string
        }
      }
      picks: {
        Row: {
          id: string
          user_id: string
          matchup_id: string
          team_picked: string
          picks_count: number
          status: 'active' | 'eliminated' | 'safe'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          matchup_id: string
          team_picked: string
          picks_count: number
          status?: 'active' | 'eliminated' | 'safe'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          matchup_id?: string
          team_picked?: string
          picks_count?: number
          status?: 'active' | 'eliminated' | 'safe'
          created_at?: string
          updated_at?: string
        }
      }
      weekly_results: {
        Row: {
          id: string
          week: number
          user_id: string
          total_picks: number
          eliminated_picks: number
          active_picks: number
          created_at: string
        }
        Insert: {
          id?: string
          week: number
          user_id: string
          total_picks: number
          eliminated_picks: number
          active_picks: number
          created_at?: string
        }
        Update: {
          id?: string
          week?: number
          user_id?: string
          total_picks?: number
          eliminated_picks?: number
          active_picks?: number
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          user_id: string
          invite_code: string
          used_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          invite_code: string
          used_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          invite_code?: string
          used_by?: string | null
          created_at?: string
        }
      }
    }
  }
} 