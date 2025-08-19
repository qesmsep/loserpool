import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Get PRE2 matchups with weather data
    const { data: matchups, error } = await supabase
      .from('matchups')
      .select('away_team, home_team, temperature, wind_speed, weather_forecast, last_api_update')
      .eq('season', 'PRE2')
      .order('game_time', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      total_matchups: matchups?.length || 0,
      matchups_with_weather: matchups?.filter(m => m.weather_forecast || m.temperature || m.wind_speed).length || 0,
      sample_matchups: matchups?.slice(0, 5).map(m => ({
        game: `${m.away_team} @ ${m.home_team}`,
        temperature: m.temperature,
        wind_speed: m.wind_speed,
        weather_forecast: m.weather_forecast,
        last_api_update: m.last_api_update
      })) || []
    })

  } catch (error) {
    console.error('Error checking weather updates:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
