import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getCurrentSeasonInfo } from '@/lib/season-detection'
import { isUserTester } from '@/lib/user-types'
import { getWeekColumnNameFromSeasonInfo } from '@/lib/week-utils'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { matchupId, teamName, pickNameIds } = await request.json()

    if (!matchupId || !teamName || !pickNameIds || !Array.isArray(pickNameIds)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get headers
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization')
    const hasBearer = !!authHeader && authHeader.toLowerCase().startsWith('bearer ')

    // Build the right client
    const supabase = hasBearer
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: authHeader! } }
        })
      : await createServerSupabaseClient()

    // Authenticate
    let userId: string
    
    if (hasBearer) {
      // Bearer Token
      const { data: { user }, error } = await supabase.auth.getUser()
      console.log({ authMethod: 'bearer', hasUser: !!user, error: error?.message })
      
      if (error || !user) {
        return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
      }
      userId = user.id
    } else {
      // Cookie Session
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log({ authMethod: 'cookie', hasSession: !!session, error: error?.message })
      
      if (error || !session) {
        return NextResponse.json({ error: 'No session found' }, { status: 401 })
      }
      userId = session.user.id
    }
    const picksCount = pickNameIds.length

    const seasonInfo = await getCurrentSeasonInfo()
    const isTester = await isUserTester(userId)
    const weekColumnName = getWeekColumnNameFromSeasonInfo(seasonInfo, isTester)
    
    console.log('🔍 Allocate API Debug:', {
      userId,
      isTester,
      seasonInfo,
      weekColumnName,
      matchupId,
      teamName,
      pickNameIds
    })

    // Validate that the picks being allocated actually exist and belong to the user
    const { data: existingPicks } = await supabase
      .from('picks')
      .select('id, pick_name, status')
      .eq('user_id', userId)
      .in('pick_name', pickNameIds)

    console.log('🔍 Picks validation debug:', {
      userId,
      picksCount,
      pickNameIds,
      existingPicksFound: existingPicks?.length || 0,
      existingPicks: existingPicks?.map(p => ({ id: p.id, pick_name: p.pick_name, status: p.status })) || []
    })

    if (!existingPicks || existingPicks.length !== pickNameIds.length) {
      const foundPickNames = existingPicks?.map(p => p.pick_name) || []
      const missingPickNames = pickNameIds.filter(id => !foundPickNames.includes(id))
      console.log('❌ Some picks not found:', { missingPickNames, foundPickNames })
      return NextResponse.json(
        { error: `Picks not found: ${missingPickNames.join(', ')}` },
        { status: 400 }
      )
    }

    // Server-side guard: prevent allocating eliminated picks
    const eliminatedPickNames = (existingPicks || [])
      .filter(p => p.status === 'eliminated')
      .map(p => p.pick_name)

    if (eliminatedPickNames.length > 0) {
      console.log('❌ Attempt to allocate eliminated picks blocked:', { eliminatedPickNames })
      return NextResponse.json(
        { error: `Cannot allocate eliminated picks: ${eliminatedPickNames.join(', ')}` },
        { status: 400 }
      )
    }

    // Create the team_matchup_id value in the format: "matchupId_teamName"
    const teamMatchupId = `${matchupId}_${teamName}`

    // Update existing picks - find picks by pick_name and update their week column
    const updatePromises = pickNameIds.map(async (pickNameId) => {
      // Find the existing pick by user_id and pick_name
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id')
        .eq('user_id', userId)
        .eq('pick_name', pickNameId)
        .single()

      if (!existingPick) {
        console.error(`No existing pick found for user ${userId} with pick_name ${pickNameId}`)
        return { error: `Pick "${pickNameId}" not found` }
      }

      // Update the existing pick with the team selection
      const { data: updatedPick, error } = await supabase
        .from('picks')
        .update({
          [weekColumnName]: teamMatchupId,
          status: 'active',
          updated_at: new Date().toISOString()
        })
        .eq('id', existingPick.id)
        .neq('status', 'eliminated')
        .select()
        .single()

      if (error) {
        console.error(`Error updating pick ${pickNameId}:`, error)
        return { error: error.message }
      }

      return { data: updatedPick, error: null }
    })

    // Wait for all updates to complete
    const results = await Promise.all(updatePromises)
    
    // Check if any updates failed
    const errors = results.filter(result => result.error).map(result => result.error)
    if (errors.length > 0) {
      console.error('Some pick updates failed:', errors)
      return NextResponse.json(
        { error: `Failed to update picks: ${errors.join(', ')}` },
        { status: 500 }
      )
    }

    // Get all updated picks for response
    const updatedPicks = results.map(result => result.data).filter(Boolean)

    return NextResponse.json({
      success: true,
      picks: updatedPicks,
      weekColumnName
    })

  } catch (error) {
    console.error('Error in picks allocation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
