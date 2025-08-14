import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client with SSR-compatible cookie handling
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          phone: string | null
          first_name: string | null
          last_name: string | null
          username: string | null
          is_admin: boolean
          invited_by: string | null
          entries_used: number
          max_entries: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          phone?: string | null
          first_name?: string | null
          last_name?: string | null
          username?: string | null
          is_admin?: boolean
          invited_by?: string | null
          entries_used?: number
          max_entries?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          phone?: string | null
          first_name?: string | null
          last_name?: string | null
          username?: string | null
          is_admin?: boolean
          invited_by?: string | null
          entries_used?: number
          max_entries?: number
          created_at?: string
          updated_at?: string
        }
      }
      purchases: {
        Row: {
          id: string
          user_id: string
          stripe_session_id: string
          amount_paid: number
          picks_count: number
          status: 'pending' | 'completed' | 'failed'
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_session_id: string
          amount_paid: number
          picks_count: number
          status?: 'pending' | 'completed' | 'failed'
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_session_id?: string
          amount_paid?: number
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
          venue: string | null
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
          venue?: string | null
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
          venue?: string | null
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
      global_settings: {
        Row: {
          id: string
          key: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
} 