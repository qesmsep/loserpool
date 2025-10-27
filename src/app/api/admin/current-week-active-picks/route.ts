import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { headers } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseAdmin = createServiceRoleClient()

    // Flexible auth: bearer token or cookie session
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    const hasBearer = !!authHeader && authHeader.toLowerCase().startsWith('bearer ')

    let userId: string | null = null
    let authMethod: 'bearer' | 'cookie' | 'none' = 'none'

    if (hasBearer) {
      authMethod = 'bearer'
      const supabaseBearer = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authHeader! } } }
      )
      const { data: { user }, error } = await supabaseBearer.auth.getUser()
      if (error || !user) {
        return NextResponse.json({ error: 'unauthorized', authMethod, detail: error?.message }, { status: 401 })
      }
      userId = user.id
    } else {
      authMethod = 'cookie'
      const supabaseCookie = await createServerSupabaseClient()
      const { data: { session }, error } = await supabaseCookie.auth.getSession()
      if (error || !session) {
        return NextResponse.json({ error: 'unauthorized', authMethod, detail: error?.message }, { status: 401 })
      }
      userId = session.user.id
    }

    // Admin check via service role
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single()
    if (profileErr || !profile?.is_admin) {
      return NextResponse.json({ error: 'unauthorized', authMethod, isAdmin: false }, { status: 401 })
    }

    // Determine current week and correct week column name
    // Use the same season detection as the rest of the app
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    // Use the same number the default-pick API returns
    const currentWeek: number | undefined = (seasonInfo as unknown as { currentWeek?: number })?.currentWeek
    if (!currentWeek || typeof currentWeek !== 'number') {
      return NextResponse.json({ error: 'no_current_week' }, { status: 500 })
    }
    // Map REG weeks 1..18 directly to reg{N}_team_matchup_id
    const weekColumnName = `reg${currentWeek}_team_matchup_id`

    const allowedCols = [
      'pre1_team_matchup_id','pre2_team_matchup_id','pre3_team_matchup_id',
      'reg1_team_matchup_id','reg2_team_matchup_id','reg3_team_matchup_id','reg4_team_matchup_id','reg5_team_matchup_id','reg6_team_matchup_id','reg7_team_matchup_id','reg8_team_matchup_id','reg9_team_matchup_id','reg10_team_matchup_id','reg11_team_matchup_id','reg12_team_matchup_id','reg13_team_matchup_id','reg14_team_matchup_id','reg15_team_matchup_id','reg16_team_matchup_id','reg17_team_matchup_id','reg18_team_matchup_id',
      'post1_team_matchup_id','post2_team_matchup_id','post3_team_matchup_id','post4_team_matchup_id'
    ]
    if (!weekColumnName || !allowedCols.includes(weekColumnName)) {
      return NextResponse.json({ error: 'invalid_week_column', weekColumnName, currentWeek }, { status: 500 })
    }

    if (!weekColumnName) {
      return NextResponse.json(
        { error: 'Unable to determine current week column' },
        { status: 500 }
      )
    }

    // Count all picks where the current week column is not null AND status is active/safe (not eliminated)
    const { count, error } = await supabaseAdmin
      .from('picks')
      .select('id', { count: 'exact', head: true })
      .not(weekColumnName, 'is', null)
      .neq('status', 'eliminated')

    if (error) {
      return NextResponse.json(
        { error: 'count_failed', detail: error.message, weekColumnName },
        { status: 500 }
      )
    }

    return NextResponse.json({
      currentWeek,
      weekColumnName,
      currentWeekActivePicksCount: count || 0,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('Error in current-week-active-picks:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}


