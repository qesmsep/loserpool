import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentUser } from '@/lib/auth'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

interface Pick {
  id: string
  user_id: string
  pick_name: string
  status: string
  picks_count: number
  created_at: string
  updated_at: string
  reg1_team_matchup_id?: string
  reg2_team_matchup_id?: string
  reg3_team_matchup_id?: string
  reg4_team_matchup_id?: string
  reg5_team_matchup_id?: string
  reg6_team_matchup_id?: string
  reg7_team_matchup_id?: string
  reg8_team_matchup_id?: string
  reg9_team_matchup_id?: string
  reg10_team_matchup_id?: string
  reg11_team_matchup_id?: string
  reg12_team_matchup_id?: string
  reg13_team_matchup_id?: string
  reg14_team_matchup_id?: string
  reg15_team_matchup_id?: string
  reg16_team_matchup_id?: string
  reg17_team_matchup_id?: string
  reg18_team_matchup_id?: string
  pre1_team_matchup_id?: string
  pre2_team_matchup_id?: string
  pre3_team_matchup_id?: string
  post1_team_matchup_id?: string
  post2_team_matchup_id?: string
  post3_team_matchup_id?: string
  post4_team_matchup_id?: string
}

export async function GET() {
  try {
    // Check for bearer token first
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const bearer = authHeader?.startsWith('Bearer ') ? authHeader : null
    
    let user = null
    
    if (bearer) {
      // Create a client with the bearer token
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: { headers: { Authorization: bearer } },
          auth: { persistSession: false, autoRefreshToken: false }
        }
      )
      
      const { data: { user: bearerUser }, error } = await supabase.auth.getUser()
      
      if (error) {
        console.error('Bearer token auth error:', error)
      } else if (bearerUser) {
        user = bearerUser
      }
    }
    
    // Fall back to cookie-based authentication if bearer token failed
    if (!user) {
      user = await getCurrentUser()
    }
    
    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    
    // Check if user is admin
    const supabaseAdmin = createServiceRoleClient()
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()
    
    if (error || !userProfile?.is_admin) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Get all picks using pagination to ensure we get every record
    let allPicks: Pick[] = []
    let hasMore = true
    let from = 0
    const pageSize = 1000

    while (hasMore) {
      const { data: picks, error: picksError } = await supabaseAdmin
        .from('picks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + pageSize - 1)

      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      if (picks && picks.length > 0) {
        allPicks = allPicks.concat(picks)
        from += pageSize
        hasMore = picks.length === pageSize
      } else {
        hasMore = false
      }
    }

    return NextResponse.json({
      picks: allPicks,
      count: allPicks.length
    })

  } catch (error) {
    console.error('Unexpected error in admin picks API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
