import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function GET() {
  try {
    const supabase = createServiceRoleClient()

    // Get all picks that are NOT eliminated
    // Status can be: 'pending', 'active', 'eliminated', 'safe'
    // We want to count picks where status != 'eliminated'
    const allPicks: Array<{ picks_count: number; status: string }> = []
    const seenIds = new Set<string>()
    const pageSize = 1000
    let lastId: string | null = null

    while (true) {
      let query = supabase
        .from('picks')
        .select('id, picks_count, status')
        .neq('status', 'eliminated')
        .order('id', { ascending: true })
        .limit(pageSize)

      if (lastId) {
        query = query.gt('id', lastId)
      }

      const { data: picks, error: picksError } = await query

      if (picksError) {
        console.error('Error fetching picks:', picksError)
        return NextResponse.json({ error: 'Failed to fetch picks' }, { status: 500 })
      }

      if (!picks || picks.length === 0) {
        break
      }

      for (const row of picks) {
        const rowId = row.id as string
        if (!seenIds.has(rowId)) {
          seenIds.add(rowId)
          allPicks.push({
            picks_count: row.picks_count || 0,
            status: row.status || 'pending'
          })
        }
        lastId = rowId
      }

      if (picks.length < pageSize) {
        break
      }
    }

    // Sum up all non-eliminated picks
    const remainingPicks = allPicks.reduce((sum, pick) => sum + pick.picks_count, 0)

    return NextResponse.json({
      remainingPicks
    })

  } catch (error) {
    console.error('Error calculating remaining picks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
