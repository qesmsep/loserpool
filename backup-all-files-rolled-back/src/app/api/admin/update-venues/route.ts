import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createClient } from '@supabase/supabase-js'
import { sportsDataService } from '@/lib/sportsdata-service'

export async function POST(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()

    const body = await request.json()
    const { season = 2024, week, action = 'update' } = body

    console.log(`Venue update request: season=${season}, week=${week}, action=${action}`)

    // Use service role key to bypass RLS for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let result: any

    switch (action) {
      case 'update':
        // Update venues for existing matchups
        result = await updateVenuesForMatchups(supabase, season, week)
        break
        
      case 'test':
        // Test the venue update process
        result = await testVenueUpdate(supabase, season, week)
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: update, test` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      week,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in venue update:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also allow GET for testing
export async function GET(request: Request) {
  try {
    // Verify admin access
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const season = searchParams.get('season') || '2024'
    const week = searchParams.get('week') || '1'
    const action = searchParams.get('action') || 'test'

    console.log(`Venue update request: season=${season}, week=${week}, action=${action}`)

    // Use service role key to bypass RLS for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    let result: any

    switch (action) {
      case 'update':
        // Update venues for existing matchups
        result = await updateVenuesForMatchups(supabase, parseInt(season), parseInt(week))
        break
        
      case 'test':
        // Test the venue update process
        result = await testVenueUpdate(supabase, parseInt(season), parseInt(week))
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: update, test` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      week,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in venue update:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

async function updateVenuesForMatchups(supabase: any, season: number, week?: number) {
  const result = {
    success: false,
    matchupsProcessed: 0,
    matchupsUpdated: 0,
    errors: [] as string[],
    details: {
      season,
      week,
      timestamp: new Date().toISOString()
    }
  }

  try {
    console.log(`Updating venues for ${season}${week ? ` Week ${week}` : ''}...`)
    
    // Get matchups that need venue updates
    let query = supabase
      .from('matchups')
      .select('id, week, away_team, home_team, game_time, venue, season')
      .is('venue', null)
      .eq('data_source', 'sportsdata.io')
    
    if (week !== undefined) {
      query = query.eq('week', week)
    }
    
    const { data: matchups, error: fetchError } = await query

    if (fetchError) {
      result.errors.push(`Failed to fetch matchups: ${fetchError.message}`)
      return result
    }

    if (!matchups || matchups.length === 0) {
      result.errors.push('No matchups found that need venue updates')
      return result
    }

    console.log(`Found ${matchups.length} matchups that need venue updates`)

    // Get games from SportsData.io for the relevant weeks
    const weeksToUpdate = [...new Set(matchups.map((m: any) => m.week))]
    const venueData: { [key: string]: string } = {}

    for (const weekNum of weeksToUpdate) {
      try {
        console.log(`Fetching venue data for Week ${weekNum}...`)
        const games = await sportsDataService.getGames(season, weekNum as number)
        
        for (const game of games) {
          const matchupKey = `${game.AwayTeam}@${game.HomeTeam}`
          if (game.StadiumDetails?.Name) {
            venueData[matchupKey] = game.StadiumDetails.Name
          }
        }
      } catch (weekError) {
        result.errors.push(`Failed to fetch venue data for Week ${weekNum}: ${weekError instanceof Error ? weekError.message : 'Unknown error'}`)
      }
    }

    // Update matchups with venue data
    for (const matchup of matchups) {
      try {
        const matchupKey = `${matchup.away_team}@${matchup.home_team}`
        const venue = venueData[matchupKey]
        
        if (venue) {
          const { error: updateError } = await supabase
            .from('matchups')
            .update({
              venue: venue,
              last_api_update: new Date().toISOString()
            })
            .eq('id', matchup.id)

          if (updateError) {
            result.errors.push(`Failed to update matchup ${matchup.id}: ${updateError.message}`)
          } else {
            result.matchupsUpdated++
            console.log(`Updated venue for ${matchup.away_team} @ ${matchup.home_team}: ${venue}`)
          }
        } else {
          console.log(`No venue data found for ${matchup.away_team} @ ${matchup.home_team}`)
        }
        
        result.matchupsProcessed++
      } catch (matchupError) {
        result.errors.push(`Error processing matchup ${matchup.id}: ${matchupError instanceof Error ? matchupError.message : 'Unknown error'}`)
      }
    }

    result.success = result.errors.length === 0
    console.log(`Venue update complete: ${result.matchupsUpdated} updated, ${result.matchupsProcessed} processed`)

  } catch (error) {
    result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('Venue update service error:', error)
  }

  return result
}

async function testVenueUpdate(supabase: any, season: number, week?: number) {
  const result = {
    success: false,
    matchupsFound: 0,
    venueDataFound: 0,
    sampleVenues: [] as string[],
    errors: [] as string[],
    details: {
      season,
      week,
      timestamp: new Date().toISOString()
    }
  }

  try {
    console.log(`Testing venue update for ${season}${week ? ` Week ${week}` : ''}...`)
    
    // Get sample matchups that need venue updates
    let query = supabase
      .from('matchups')
      .select('id, week, away_team, home_team, game_time, venue, season')
      .is('venue', null)
      .eq('data_source', 'sportsdata.io')
      .limit(5)
    
    if (week !== undefined) {
      query = query.eq('week', week)
    }
    
    const { data: matchups, error: fetchError } = await query

    if (fetchError) {
      result.errors.push(`Failed to fetch matchups: ${fetchError.message}`)
      return result
    }

    if (!matchups || matchups.length === 0) {
      result.errors.push('No matchups found that need venue updates')
      return result
    }

    result.matchupsFound = matchups.length
    console.log(`Found ${matchups.length} sample matchups that need venue updates`)

    // Test venue data retrieval for the first matchup's week
    const testWeek = matchups[0].week
    console.log(`Testing venue data retrieval for Week ${testWeek}...`)
    
    try {
      const games = await sportsDataService.getGames(season, testWeek)
      console.log(`Retrieved ${games.length} games from SportsData.io`)
      
      for (const game of games) {
        if (game.StadiumDetails?.Name) {
          result.venueDataFound++
          result.sampleVenues.push(`${game.AwayTeam} @ ${game.HomeTeam}: ${game.StadiumDetails.Name}`)
        }
      }
      
      result.success = true
    } catch (weekError) {
      result.errors.push(`Failed to fetch venue data for Week ${testWeek}: ${weekError instanceof Error ? weekError.message : 'Unknown error'}`)
    }

  } catch (error) {
    result.errors.push(`Service error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    console.error('Venue update test error:', error)
  }

  return result
}
