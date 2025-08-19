import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Verify cron secret token
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting automatic week advancement check...')
    
    const supabase = createServiceRoleClient()
    
    // Get current week from global settings
    const { data: weekSetting } = await supabase
      .from('global_settings')
      .select('value')
      .eq('key', 'current_week')
      .single()

    const currentWeek = parseInt(weekSetting?.value || '1')
    console.log(`Current week: ${currentWeek}`)

    // Determine current season type
    let currentSeason = 'REG'
    if (currentWeek <= 4) {
      currentSeason = 'PRE'
    } else if (currentWeek > 21) {
      currentSeason = 'POST'
    }

    const seasonString = `${currentSeason}${currentWeek}`
    console.log(`Checking games for ${seasonString}`)

    // Get all matchups for the current week
    const { data: matchups, error: fetchError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team, status, game_time')
      .eq('week', currentWeek)
      .eq('season', seasonString)

    if (fetchError) {
      console.error('Error fetching matchups:', fetchError)
      return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })
    }

    if (!matchups || matchups.length === 0) {
      console.log(`No matchups found for ${seasonString}`)
      return NextResponse.json({ 
        success: true, 
        message: `No matchups found for ${seasonString}`,
        week_advanced: false 
      })
    }

    console.log(`Found ${matchups.length} matchups for ${seasonString}`)

    // Check if all games are final
    const allGamesFinal = matchups.every(matchup => matchup.status === 'final')
    const scheduledGames = matchups.filter(m => m.status === 'scheduled')
    const liveGames = matchups.filter(m => m.status === 'live')
    const finalGames = matchups.filter(m => m.status === 'final')

    console.log(`Game status breakdown: ${scheduledGames.length} scheduled, ${liveGames.length} live, ${finalGames.length} final`)

    if (!allGamesFinal) {
      console.log(`Not all games are final yet. Cannot advance week.`)
      return NextResponse.json({
        success: true,
        message: 'Not all games are final yet',
        week_advanced: false,
        games_status: {
          scheduled: scheduledGames.length,
          live: liveGames.length,
          final: finalGames.length,
          total: matchups.length
        }
      })
    }

    // All games are final, advance to next week
    const nextWeek = currentWeek + 1
    console.log(`All games are final. Advancing from week ${currentWeek} to week ${nextWeek}`)

    // Determine next week season type
    let nextSeason = 'REG'
    if (nextWeek <= 4) {
      nextSeason = 'PRE'
    } else if (nextWeek > 21) {
      nextSeason = 'POST'
    }

    const nextSeasonString = `${nextSeason}${nextWeek}`

    // Check if next week has games in the database
    const { data: nextWeekMatchups, error: nextWeekError } = await supabase
      .from('matchups')
      .select('id, away_team, home_team')
      .eq('week', nextWeek)
      .eq('season', nextSeasonString)

    if (nextWeekError) {
      console.error('Error checking next week matchups:', nextWeekError)
      return NextResponse.json({ success: false, error: nextWeekError.message }, { status: 500 })
    }

    if (!nextWeekMatchups || nextWeekMatchups.length === 0) {
      console.log(`No matchups found for next week ${nextSeasonString}`)
      return NextResponse.json({
        success: true,
        message: `No matchups found for next week ${nextSeasonString}`,
        week_advanced: false,
        next_week: nextWeek,
        next_season: nextSeasonString
      })
    }

               // Update the current week in global settings
           const { error: updateError } = await supabase
             .from('global_settings')
             .upsert({
               key: 'current_week',
               value: nextWeek.toString()
             })

           if (updateError) {
             console.error('Error updating current week:', updateError)
             return NextResponse.json({
               success: false,
               error: `Failed to update current week: ${updateError.message}`
             }, { status: 500 })
           }

           // Reset week allocations for surviving picks (carry them forward as unallocated)
           console.log('Resetting week allocations for surviving picks...')
           
           // Get the column name for the next week
           let nextWeekColumn = ''
           if (nextWeek <= 3) {
             nextWeekColumn = `pre${nextWeek}_team_matchup_id`
           } else if (nextWeek <= 21) {
             nextWeekColumn = `reg${nextWeek - 3}_team_matchup_id`
           } else {
             nextWeekColumn = `post${nextWeek - 21}_team_matchup_id`
           }

           // Get all surviving picks that need to be carried forward
           const { data: survivingPicks, error: survivingError } = await supabase
             .from('picks')
             .select('id, user_id, picks_count, status')
             .eq('status', 'safe')

           if (survivingError) {
             console.error('Error fetching surviving picks:', survivingError)
             return NextResponse.json({
               success: false,
               error: `Failed to fetch surviving picks: ${survivingError.message}`
             }, { status: 500 })
           }

           if (survivingPicks && survivingPicks.length > 0) {
             console.log(`Found ${survivingPicks.length} surviving picks to carry forward`)
             
             // Reset the next week column for all surviving picks (make them unallocated)
             const { error: resetError } = await supabase
               .from('picks')
               .update({ [nextWeekColumn]: null })
               .eq('status', 'safe')

             if (resetError) {
               console.error('Error resetting week allocations:', resetError)
               return NextResponse.json({
                 success: false,
                 error: `Failed to reset week allocations: ${resetError.message}`
               }, { status: 500 })
             }

                          console.log(`Successfully reset week allocations for ${survivingPicks.length} surviving picks`)
           } else {
             console.log('No surviving picks to carry forward')
           }

    const executionTime = Date.now() - startTime
    
    console.log(`Week advancement completed in ${executionTime}ms: Week ${currentWeek} → Week ${nextWeek}`)

    return NextResponse.json({
      success: true,
      message: `Week advanced successfully from ${currentWeek} to ${nextWeek}`,
      week_advanced: true,
      previous_week: currentWeek,
      new_week: nextWeek,
      previous_season: seasonString,
      new_season: nextSeasonString,
      execution_time_ms: executionTime,
      games_checked: matchups.length
    })

  } catch (error) {
    console.error('Error in automatic week advancement:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
