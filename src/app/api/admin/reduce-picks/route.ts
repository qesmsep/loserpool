import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'
import { requireAdmin } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    // Check admin authentication
    const adminUser = await requireAdmin()
    console.log('Admin check passed:', adminUser?.email)

    const { userId, picksCount } = await request.json()

    if (!userId || !picksCount || picksCount <= 0) {
      return NextResponse.json(
        { error: 'Invalid parameters: userId and picksCount (positive number) required' },
        { status: 400 }
      )
    }

    // Create service role client to bypass RLS
    const supabaseAdmin = createServiceRoleClient()

    // Get user's current picks
    const { data: userPicks, error: picksError } = await supabaseAdmin
      .from('picks')
      .select('id, picks_count, status')
      .eq('user_id', userId)
      .eq('status', 'active')

    if (picksError) {
      console.error('Error fetching user picks:', picksError)
      return NextResponse.json({ error: 'Failed to fetch user picks' }, { status: 500 })
    }

    if (!userPicks || userPicks.length === 0) {
      return NextResponse.json({ error: 'User has no active picks to reduce' }, { status: 400 })
    }

    // Calculate total active picks
    const totalActivePicks = userPicks.reduce((sum, pick) => sum + pick.picks_count, 0)

    if (picksCount > totalActivePicks) {
      return NextResponse.json(
        { error: `Cannot reduce ${picksCount} picks. User only has ${totalActivePicks} active picks.` },
        { status: 400 }
      )
    }

    // Reduce picks from active picks, starting with the first pick
    let remainingToReduce = picksCount
    const updates: Promise<{ error?: unknown }>[] = []

    for (const pick of userPicks) {
      if (remainingToReduce <= 0) break

      const reduceFromThisPick = Math.min(remainingToReduce, pick.picks_count)
      const newPicksCount = pick.picks_count - reduceFromThisPick

      if (newPicksCount === 0) {
        // If this pick will have 0 picks, mark it as eliminated
        updates.push(
          supabaseAdmin
            .from('picks')
            .update({ 
              picks_count: 0,
              status: 'eliminated'
            })
            .eq('id', pick.id)
        )
      } else {
        // Just reduce the picks count
        updates.push(
          supabaseAdmin
            .from('picks')
            .update({ picks_count: newPicksCount })
            .eq('id', pick.id)
        )
      }

      remainingToReduce -= reduceFromThisPick
    }

    // Execute all updates
    const results = await Promise.all(updates)
    
    // Check for any errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Errors updating picks:', errors)
      return NextResponse.json({ error: 'Failed to update some picks' }, { status: 500 })
    }

    // Get updated user info for response
    const { data: updatedUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('username, email')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error fetching updated user:', userError)
    }

    const userName = updatedUser?.username || updatedUser?.email || 'User'

    return NextResponse.json({
      success: true,
      message: `Successfully reduced ${picksCount} picks for ${userName}`,
      reducedPicks: picksCount
    })

  } catch (error) {
    console.error('Admin reduce picks API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
