import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    await requireAdmin()
    const supabase = await createServerSupabaseClient()

    // Get current picks status counts before reset
    const { data: picksBeforeReset } = await supabase
      .from('picks')
      .select('status')

    const countsBefore = {
      active: picksBeforeReset?.filter(p => p.status === 'active').length || 0,
      eliminated: picksBeforeReset?.filter(p => p.status === 'eliminated').length || 0,
      safe: picksBeforeReset?.filter(p => p.status === 'safe').length || 0,
      pending: picksBeforeReset?.filter(p => p.status === 'pending').length || 0
    }

    // Reset all picks to 'active' status
    const { data: resetResult, error: resetError } = await supabase
      .from('picks')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .neq('status', 'active') // Only update picks that aren't already active

    if (resetError) {
      console.error('Error resetting picks:', resetError)
      return NextResponse.json(
        { error: 'Failed to reset picks', details: resetError.message },
        { status: 500 }
      )
    }

    // Get updated counts
    const { data: picksAfterReset } = await supabase
      .from('picks')
      .select('status')

    const countsAfter = {
      active: picksAfterReset?.filter(p => p.status === 'active').length || 0,
      eliminated: picksAfterReset?.filter(p => p.status === 'eliminated').length || 0,
      safe: picksAfterReset?.filter(p => p.status === 'safe').length || 0,
      pending: picksAfterReset?.filter(p => p.status === 'pending').length || 0
    }

    // Calculate how many picks were reset
    const picksReset = countsBefore.eliminated + countsBefore.safe + countsBefore.pending

    console.log(`Picks reset successfully: ${picksReset} picks brought back to life`)

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${picksReset} picks back to active status`,
      countsBefore,
      countsAfter,
      picksReset
    })

  } catch (error) {
    console.error('Error in reset picks endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
