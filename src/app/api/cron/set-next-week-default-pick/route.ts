import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

// Compute and persist next week's default pick favorite every Tuesday at 8am
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN

    if (!expectedToken) {
      console.error('CRON_SECRET_TOKEN not configured')
      return NextResponse.json({ error: 'Cron token not configured' }, { status: 500 })
    }

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    // Only run on Tuesdays to be safe (Vercel cron should already enforce)
    if (now.getDay() !== 2) {
      return NextResponse.json({ message: 'Not Tuesday; skipped' })
    }

    const supabase = createServiceRoleClient()

    // Determine next week from dynamic season detection
    const { getCurrentSeasonInfo } = await import('@/lib/season-detection')
    const seasonInfo = await getCurrentSeasonInfo()
    const nextWeek = seasonInfo.currentWeek + 1

    // Fetch all scheduled matchups for next week
    const { data: matchups, error: matchupsError } = await supabase
      .from('matchups')
      .select('*')
      .eq('week', nextWeek)
      .eq('status', 'scheduled')
      .order('game_time', { ascending: true })

    if (matchupsError) {
      console.error('Error fetching next-week matchups:', matchupsError)
      return NextResponse.json({ error: 'Failed to fetch matchups' }, { status: 500 })
    }

    if (!matchups || matchups.length === 0) {
      return NextResponse.json({ message: `No scheduled matchups for week ${nextWeek}` })
    }

    // Choose matchup with largest absolute spread; pick favorite (negative spread)
    const futureMatchups = matchups.filter(m => new Date(m.game_time) > now)
    const pool = futureMatchups.length > 0 ? futureMatchups : matchups

    const best = pool.reduce((bestSoFar, current) => {
      const bestAbs = Math.max(Math.abs(bestSoFar.away_spread || 0), Math.abs(bestSoFar.home_spread || 0))
      const currentAbs = Math.max(Math.abs(current.away_spread || 0), Math.abs(current.home_spread || 0))
      return currentAbs > bestAbs ? current : bestSoFar
    })

    // Determine favored team as team with negative spread
    const awaySpread = best.away_spread || 0
    const homeSpread = best.home_spread || 0
    const favored_team = awaySpread < 0 ? best.away_team : homeSpread < 0 ? best.home_team : best.away_team
    const spread_magnitude = Math.max(Math.abs(awaySpread), Math.abs(homeSpread))

    const payload = {
      week: nextWeek,
      matchup_id: best.id,
      away_team: best.away_team,
      home_team: best.home_team,
      favored_team,
      spread_magnitude,
      game_time: best.game_time,
      computed_at: now.toISOString()
    }

    // Persist in global_settings under key next_week_default_pick
    const { error: upsertError } = await supabase
      .from('global_settings')
      .upsert({
        key: 'next_week_default_pick',
        value: JSON.stringify(payload)
      })

    if (upsertError) {
      console.error('Error saving next_week_default_pick:', upsertError)
      return NextResponse.json({ error: 'Failed to persist default pick' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Next week default pick saved', data: payload })
  } catch (error) {
    console.error('Error in set-next-week-default-pick cron:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Allow GET for manual testing
export async function GET() {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('global_settings')
    .select('key, value, updated_at')
    .eq('key', 'next_week_default_pick')
    .single()
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ data })
}



