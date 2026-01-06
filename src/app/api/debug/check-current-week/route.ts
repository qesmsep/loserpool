import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { getCurrentSeasonInfo } from '@/lib/season-detection'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()
    
    // 1. Get season detection (what the app uses)
    const seasonInfo = await getCurrentSeasonInfo()
    
    // 2. Check what matchups exist for the detected season
    const { data: currentMatchups } = await supabase
      .from('matchups')
      .select('id, season, week, away_team, home_team, game_time, status')
      .eq('season', seasonInfo.seasonDisplay)
      .order('game_time', { ascending: true })
    
    // 3. Check all matchups by season
    const { data: allMatchups } = await supabase
      .from('matchups')
      .select('season, week')
      .order('season', { ascending: true })
      .order('week', { ascending: true })
    
    type MatchupSummary = { season: string | null; week: number | null }
    
    const grouped = allMatchups?.reduce((acc: Record<string, { count: number; weeks: Set<number> }>, m: MatchupSummary) => {
      const key = m.season || 'UNKNOWN'
      if (!acc[key]) {
        acc[key] = { count: 0, weeks: new Set() }
      }
      acc[key].count++
      if (m.week !== null) {
        acc[key].weeks.add(m.week)
      }
      return acc
    }, {}) || {}
    
    // 4. Check non-final games
    const { data: nonFinal } = await supabase
      .from('matchups')
      .select('season, week')
      .neq('status', 'final')
    
    const nonFinalGrouped = nonFinal?.reduce((acc: Record<string, number>, m: MatchupSummary) => {
      const key = `${m.season}-W${m.week}`
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {}) || {}
    
    // 5. Check playoff matchups
    const { data: playoffMatchups } = await supabase
      .from('matchups')
      .select('season, week, away_team, home_team, game_time, status')
      .like('season', 'POST%')
      .order('season', { ascending: true })
      .order('game_time', { ascending: true })
    
    // 6. Recent matchups (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentMatchups } = await supabase
      .from('matchups')
      .select('season, week, away_team, home_team, game_time, status')
      .gte('game_time', sevenDaysAgo)
      .order('game_time', { ascending: true })
      .limit(20)
    
    return NextResponse.json({
      success: true,
      seasonDetection: {
        currentSeason: seasonInfo.currentSeason,
        currentWeek: seasonInfo.currentWeek,
        seasonDisplay: seasonInfo.seasonDisplay,
        isPostseason: seasonInfo.isPostseason,
        seasonYear: seasonInfo.seasonYear
      },
      detectedSeasonMatchups: {
        count: currentMatchups?.length || 0,
        matchups: currentMatchups || []
      },
      allMatchupsBySeason: Object.entries(grouped).map(([season, data]) => ({
        season,
        count: data.count,
        weeks: Array.from(data.weeks).sort((a, b) => a - b)
      })),
      nonFinalGames: Object.entries(nonFinalGrouped).map(([key, count]) => ({
        key,
        count
      })),
      playoffMatchups: {
        count: playoffMatchups?.length || 0,
        matchups: playoffMatchups || []
      },
      recentMatchups: recentMatchups || [],
      summary: {
        appIsDetecting: seasonInfo.seasonDisplay,
        matchupsForDetectedSeason: currentMatchups?.length || 0,
        hasMatchups: (currentMatchups?.length || 0) > 0,
        problem: (currentMatchups?.length || 0) === 0 ? 'No matchups found for detected season - need to fetch from ESPN' : 'OK'
      }
    })
    
  } catch (error) {
    console.error('Error checking current week:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

