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
          user_type: 'pending' | 'active' | 'tester' | 'eliminated'
          default_week: number
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
          user_type?: 'pending' | 'active' | 'tester' | 'eliminated'
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
          user_type?: 'pending' | 'active' | 'tester' | 'eliminated'
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
          season: string
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
          season?: string
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
          status: 'pending' | 'active' | 'eliminated' | 'safe'
          created_at: string
          updated_at: string
          picks_count: number
          pick_name: string | null
          notes: string | null
          pre1_team_matchup_id: string | null
          pre2_team_matchup_id: string | null
          pre3_team_matchup_id: string | null
          reg1_team_matchup_id: string | null
          reg2_team_matchup_id: string | null
          reg3_team_matchup_id: string | null
          reg4_team_matchup_id: string | null
          reg5_team_matchup_id: string | null
          reg6_team_matchup_id: string | null
          reg7_team_matchup_id: string | null
          reg8_team_matchup_id: string | null
          reg9_team_matchup_id: string | null
          reg10_team_matchup_id: string | null
          reg11_team_matchup_id: string | null
          reg12_team_matchup_id: string | null
          reg13_team_matchup_id: string | null
          reg14_team_matchup_id: string | null
          reg15_team_matchup_id: string | null
          reg16_team_matchup_id: string | null
          reg17_team_matchup_id: string | null
          reg18_team_matchup_id: string | null
          post1_team_matchup_id: string | null
          post2_team_matchup_id: string | null
          post3_team_matchup_id: string | null
          post4_team_matchup_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'pending' | 'active' | 'eliminated' | 'safe'
          created_at?: string
          updated_at?: string
          picks_count: number
          pick_name?: string | null
          notes?: string | null
          pre1_team_matchup_id?: string | null
          pre2_team_matchup_id?: string | null
          pre3_team_matchup_id?: string | null
          reg1_team_matchup_id?: string | null
          reg2_team_matchup_id?: string | null
          reg3_team_matchup_id?: string | null
          reg4_team_matchup_id?: string | null
          reg5_team_matchup_id?: string | null
          reg6_team_matchup_id?: string | null
          reg7_team_matchup_id?: string | null
          reg8_team_matchup_id?: string | null
          reg9_team_matchup_id?: string | null
          reg10_team_matchup_id?: string | null
          reg11_team_matchup_id?: string | null
          reg12_team_matchup_id?: string | null
          reg13_team_matchup_id?: string | null
          reg14_team_matchup_id?: string | null
          reg15_team_matchup_id?: string | null
          reg16_team_matchup_id?: string | null
          reg17_team_matchup_id?: string | null
          reg18_team_matchup_id?: string | null
          post1_team_matchup_id?: string | null
          post2_team_matchup_id?: string | null
          post3_team_matchup_id?: string | null
          post4_team_matchup_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'pending' | 'active' | 'eliminated' | 'safe'
          created_at?: string
          updated_at?: string
          picks_count?: number
          pick_name?: string | null
          notes?: string | null
          pre1_team_matchup_id?: string | null
          pre2_team_matchup_id?: string | null
          pre3_team_matchup_id?: string | null
          reg1_team_matchup_id?: string | null
          reg2_team_matchup_id?: string | null
          reg3_team_matchup_id?: string | null
          reg4_team_matchup_id?: string | null
          reg5_team_matchup_id?: string | null
          reg6_team_matchup_id?: string | null
          reg7_team_matchup_id?: string | null
          reg8_team_matchup_id?: string | null
          reg9_team_matchup_id?: string | null
          reg10_team_matchup_id?: string | null
          reg11_team_matchup_id?: string | null
          reg12_team_matchup_id?: string | null
          reg13_team_matchup_id?: string | null
          reg14_team_matchup_id?: string | null
          reg15_team_matchup_id?: string | null
          reg16_team_matchup_id?: string | null
          reg17_team_matchup_id?: string | null
          reg18_team_matchup_id?: string | null
          post1_team_matchup_id?: string | null
          post2_team_matchup_id?: string | null
          post3_team_matchup_id?: string | null
          post4_team_matchup_id?: string | null
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
      leaderboard: {
        Row: {
          id: string
          user_id: string
          week: number
          picks_remaining: number
          picks_eliminated: number
          total_picks_started: number
          rank: number | null
          eliminated_at_week: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week: number
          picks_remaining?: number
          picks_eliminated?: number
          total_picks_started?: number
          rank?: number | null
          eliminated_at_week?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week?: number
          picks_remaining?: number
          picks_eliminated?: number
          total_picks_started?: number
          rank?: number | null
          eliminated_at_week?: number | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Export commonly used types
export type Matchup = Database['public']['Tables']['matchups']['Row']
export type Pick = Database['public']['Tables']['picks']['Row']
export type User = Database['public']['Tables']['users']['Row']