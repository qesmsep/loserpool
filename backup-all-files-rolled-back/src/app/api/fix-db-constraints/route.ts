import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = createServiceRoleClient()

    console.log('Fixing database constraints...')

    // Fix status constraint to allow 'TBD' status
    const { error: statusError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS matchups_status_check;
        ALTER TABLE public.matchups ADD CONSTRAINT matchups_status_check 
            CHECK (status IN ('scheduled', 'live', 'final', 'postponed', 'delayed', 'rescheduled', 'TBD'));
      `
    })

    if (statusError) {
      console.error('Error fixing status constraint:', statusError)
      return NextResponse.json({ success: false, error: statusError.message })
    }

    // Ensure season column exists
    const { error: seasonError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.matchups ADD COLUMN IF NOT EXISTS season TEXT;
        CREATE INDEX IF NOT EXISTS idx_matchups_season ON public.matchups(season);
        ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS check_season_format;
        ALTER TABLE public.matchups ADD CONSTRAINT check_season_format
            CHECK (season ~ '^(PRE|REG|POST)\d+$');
        ALTER TABLE public.matchups DROP CONSTRAINT IF EXISTS unique_matchup_season_teams;
        ALTER TABLE public.matchups ADD CONSTRAINT unique_matchup_season_teams
            UNIQUE (season, away_team, home_team);
      `
    })

    if (seasonError) {
      console.error('Error fixing season constraints:', seasonError)
      return NextResponse.json({ success: false, error: seasonError.message })
    }

    console.log('Database constraints fixed successfully!')
    return NextResponse.json({ success: true, message: 'Database constraints fixed successfully' })

  } catch (error) {
    console.error('Error fixing database constraints:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
