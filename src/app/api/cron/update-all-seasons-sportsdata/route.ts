import { NextResponse } from 'next/server'
import { matchupUpdateServiceSportsData } from '@/lib/matchup-update-service-sportsdata'
import { sportsDataService } from '@/lib/sportsdata-service'

interface SeasonUpdateResult {
  season: string
  success: boolean
  gamesUpdated: number
  gamesAdded: number
  gamesSkipped: number
  errors: string[]
  details: {
    week: number
    season: number
    timestamp: string
  }
}

interface AllSeasonsResult {
  success: boolean
  totalGamesUpdated: number
  totalGamesAdded: number
  totalGamesSkipped: number
  seasonResults: SeasonUpdateResult[]
  timestamp: string
}

export async function POST(request: Request) {
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      console.error('Invalid cron secret token')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { season = 2025, action = 'all-seasons' } = body

    console.log(`Cron all seasons update: season=${season}, action=${action}`)

    let result: AllSeasonsResult

    switch (action) {
      case 'all-seasons':
        // Update all seasons (preseason, regular season, postseason)
        result = await updateAllSeasons(season)
        break
        
      case 'preseason':
        // Update preseason only
        result = await updatePreseason(season)
        break
        
      case 'regular-season':
        // Update regular season only
        result = await updateRegularSeason(season)
        break
        
      case 'postseason':
        // Update postseason only
        result = await updatePostseason(season)
        break
        
      case 'current-week-all-seasons':
        // Update current week for all active seasons
        result = await updateCurrentWeekAllSeasons(season)
        break
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: all-seasons, preseason, regular-season, postseason, current-week-all-seasons` },
          { status: 400 }
        )
    }

    console.log(`Cron all seasons update completed:`, result)

    return NextResponse.json({
      success: true,
      action,
      season,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in cron all seasons update:', error)
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

// Also allow GET for manual testing
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const season = parseInt(searchParams.get('season') || '2025')
    const action = searchParams.get('action') || 'all-seasons'

    console.log(`Manual cron all seasons update: season=${season}, action=${action}`)

    let result: AllSeasonsResult

    switch (action) {
      case 'all-seasons':
        result = await updateAllSeasons(season)
        break
        
      case 'preseason':
        result = await updatePreseason(season)
        break
        
      case 'regular-season':
        result = await updateRegularSeason(season)
        break
        
      case 'postseason':
        result = await updatePostseason(season)
        break
        
      case 'current-week-all-seasons':
        result = await updateCurrentWeekAllSeasons(season)
        break
        
      case 'test':
        // Test the service
        const testResult = await matchupUpdateServiceSportsData.testService()
        return NextResponse.json({
          success: true,
          action: 'test',
          season,
          result: testResult,
          timestamp: new Date().toISOString()
        })
        
      default:
        return NextResponse.json(
          { error: `Invalid action: ${action}. Valid actions: all-seasons, preseason, regular-season, postseason, current-week-all-seasons, test` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      action,
      season,
      result,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in manual cron all seasons update:', error)
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

// Update all seasons (preseason, regular season, postseason)
async function updateAllSeasons(season: number): Promise<AllSeasonsResult> {
  console.log(`Updating all seasons for ${season}...`)
  
  const seasonResults: SeasonUpdateResult[] = []
  let totalGamesUpdated = 0
  let totalGamesAdded = 0
  let totalGamesSkipped = 0

  try {
    // Update preseason (weeks 1-4)
    console.log('Updating preseason...')
    const preseasonResult = await updatePreseason(season)
    seasonResults.push(...preseasonResult.seasonResults)
    totalGamesUpdated += preseasonResult.totalGamesUpdated
    totalGamesAdded += preseasonResult.totalGamesAdded
    totalGamesSkipped += preseasonResult.totalGamesSkipped

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update regular season (weeks 1-18)
    console.log('Updating regular season...')
    const regularResult = await updateRegularSeason(season)
    seasonResults.push(...regularResult.seasonResults)
    totalGamesUpdated += regularResult.totalGamesUpdated
    totalGamesAdded += regularResult.totalGamesAdded
    totalGamesSkipped += regularResult.totalGamesSkipped

    // Add delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Update postseason (weeks 19-22)
    console.log('Updating postseason...')
    const postseasonResult = await updatePostseason(season)
    seasonResults.push(...postseasonResult.seasonResults)
    totalGamesUpdated += postseasonResult.totalGamesUpdated
    totalGamesAdded += postseasonResult.totalGamesAdded
    totalGamesSkipped += postseasonResult.totalGamesSkipped

    return {
      success: true,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error updating all seasons:', error)
    return {
      success: false,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }
  }
}

// Update preseason (weeks 1-4)
async function updatePreseason(season: number): Promise<AllSeasonsResult> {
  console.log(`Updating preseason for ${season}...`)
  
  const seasonResults: SeasonUpdateResult[] = []
  let totalGamesUpdated = 0
  let totalGamesAdded = 0
  let totalGamesSkipped = 0

  try {
    // Get preseason schedule using the correct season format
    const seasonKey = `${season}PRE`
    const schedule = await sportsDataService.getSeasonSchedule(seasonKey)
    console.log(`Retrieved ${schedule.length} preseason games for ${seasonKey}`)
    
    // Group by week
    const gamesByWeek = new Map<number, any[]>()
    schedule.forEach(game => {
      if (!gamesByWeek.has(game.Week)) {
        gamesByWeek.set(game.Week, [])
      }
      gamesByWeek.get(game.Week)!.push(game)
    })

    // Update each preseason week
    const weeks = Array.from(gamesByWeek.keys()).sort((a, b) => a - b)
    for (const week of weeks) {
      console.log(`Updating preseason Week ${week}...`)
      const result = await matchupUpdateServiceSportsData.updateWeekMatchups(seasonKey, week, `PRE${week}`)
      
      const seasonResult: SeasonUpdateResult = {
        season: `PRE${week}`,
        success: result.success,
        gamesUpdated: result.gamesUpdated,
        gamesAdded: result.gamesAdded,
        gamesSkipped: result.gamesSkipped,
        errors: result.errors,
        details: result.details
      }
      
      seasonResults.push(seasonResult)
      totalGamesUpdated += result.gamesUpdated
      totalGamesAdded += result.gamesAdded
      totalGamesSkipped += result.gamesSkipped

      // Add delay between weeks
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: true,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error updating preseason:', error)
    return {
      success: false,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }
  }
}

// Update regular season (weeks 1-18)
async function updateRegularSeason(season: number): Promise<AllSeasonsResult> {
  console.log(`Updating regular season for ${season}...`)
  
  const seasonResults: SeasonUpdateResult[] = []
  let totalGamesUpdated = 0
  let totalGamesAdded = 0
  let totalGamesSkipped = 0

  try {
    // Get regular season schedule using the correct season format
    const seasonKey = `${season}REG`
    const schedule = await sportsDataService.getSeasonSchedule(seasonKey)
    console.log(`Retrieved ${schedule.length} regular season games for ${seasonKey}`)
    
    // Group by week
    const gamesByWeek = new Map<number, any[]>()
    schedule.forEach(game => {
      if (!gamesByWeek.has(game.Week)) {
        gamesByWeek.set(game.Week, [])
      }
      gamesByWeek.get(game.Week)!.push(game)
    })

    // Update each regular season week
    const weeks = Array.from(gamesByWeek.keys()).sort((a, b) => a - b)
    for (const week of weeks) {
      console.log(`Updating regular season Week ${week}...`)
      const result = await matchupUpdateServiceSportsData.updateWeekMatchups(seasonKey, week, `REG${week}`)
      
      const seasonResult: SeasonUpdateResult = {
        season: `REG${week}`,
        success: result.success,
        gamesUpdated: result.gamesUpdated,
        gamesAdded: result.gamesAdded,
        gamesSkipped: result.gamesSkipped,
        errors: result.errors,
        details: result.details
      }
      
      seasonResults.push(seasonResult)
      totalGamesUpdated += result.gamesUpdated
      totalGamesAdded += result.gamesAdded
      totalGamesSkipped += result.gamesSkipped

      // Add delay between weeks
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: true,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error updating regular season:', error)
    return {
      success: false,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }
  }
}

// Update postseason (weeks 19-22)
async function updatePostseason(season: number): Promise<AllSeasonsResult> {
  console.log(`Updating postseason for ${season}...`)
  
  const seasonResults: SeasonUpdateResult[] = []
  let totalGamesUpdated = 0
  let totalGamesAdded = 0
  let totalGamesSkipped = 0

  try {
    // Get postseason schedule using the correct season format
    const seasonKey = `${season}POST`
    const schedule = await sportsDataService.getSeasonSchedule(seasonKey)
    console.log(`Retrieved ${schedule.length} postseason games for ${seasonKey}`)
    
    // Group by week
    const gamesByWeek = new Map<number, any[]>()
    schedule.forEach(game => {
      if (!gamesByWeek.has(game.Week)) {
        gamesByWeek.set(game.Week, [])
      }
      gamesByWeek.get(game.Week)!.push(game)
    })

    // Update each postseason week
    const weeks = Array.from(gamesByWeek.keys()).sort((a, b) => a - b)
    for (const week of weeks) {
      console.log(`Updating postseason Week ${week}...`)
      const result = await matchupUpdateServiceSportsData.updateWeekMatchups(seasonKey, week, `POST${week}`)
      
      const seasonResult: SeasonUpdateResult = {
        season: `POST${week}`,
        success: result.success,
        gamesUpdated: result.gamesUpdated,
        gamesAdded: result.gamesAdded,
        gamesSkipped: result.gamesSkipped,
        errors: result.errors,
        details: result.details
      }
      
      seasonResults.push(seasonResult)
      totalGamesUpdated += result.gamesUpdated
      totalGamesAdded += result.gamesAdded
      totalGamesSkipped += result.gamesSkipped

      // Add delay between weeks
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: true,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error updating postseason:', error)
    return {
      success: false,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }
  }
}

// Update current week for all active seasons
async function updateCurrentWeekAllSeasons(season: number): Promise<AllSeasonsResult> {
  console.log(`Updating current week for all active seasons in ${season}...`)
  
  const seasonResults: SeasonUpdateResult[] = []
  let totalGamesUpdated = 0
  let totalGamesAdded = 0
  let totalGamesSkipped = 0

  try {
    // Get current week from SportsData.io
    const currentWeek = await sportsDataService.getCurrentWeek(season)
    console.log(`Current week: ${currentWeek}`)

    // Determine which season type we're in based on the week
    let seasonType = 'REG'
    let seasonWeek = currentWeek

    if (currentWeek <= 4) {
      seasonType = 'PRE'
      seasonWeek = currentWeek
    } else if (currentWeek <= 21) {
      seasonType = 'REG'
      seasonWeek = currentWeek - 4
    } else {
      seasonType = 'POST'
      seasonWeek = currentWeek - 21
    }

    console.log(`Current season type: ${seasonType}${seasonWeek}`)

    // Update current week
    const result = await matchupUpdateServiceSportsData.updateWeekMatchups(season, currentWeek)
    
    const seasonResult: SeasonUpdateResult = {
      season: `${seasonType}${seasonWeek}`,
      success: result.success,
      gamesUpdated: result.gamesUpdated,
      gamesAdded: result.gamesAdded,
      gamesSkipped: result.gamesSkipped,
      errors: result.errors,
      details: result.details
    }
    
    seasonResults.push(seasonResult)
    totalGamesUpdated += result.gamesUpdated
    totalGamesAdded += result.gamesAdded
    totalGamesSkipped += result.gamesSkipped

    // Sync current week with database
    await matchupUpdateServiceSportsData.syncCurrentWeek(season)

    return {
      success: true,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }

  } catch (error) {
    console.error('Error updating current week for all seasons:', error)
    return {
      success: false,
      totalGamesUpdated,
      totalGamesAdded,
      totalGamesSkipped,
      seasonResults,
      timestamp: new Date().toISOString()
    }
  }
}
