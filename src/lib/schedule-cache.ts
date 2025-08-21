import { createServerSupabaseClient } from './supabase-server'

interface CachedSchedule {
  id: string
  week_type: 'current' | 'next'
  week_number: number
  week_display: string
  games: Array<Record<string, unknown>>
  last_updated: string
  expires_at: string
}

export class ScheduleCache {
  private static CACHE_DURATION_MINUTES = 30 // Cache for 30 minutes

  // Get cached schedule data
  static async getCachedSchedule(weekType: 'current' | 'next'): Promise<CachedSchedule | null> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const now = new Date()
      const { data, error } = await supabase
        .from('schedule_cache')
        .select('*')
        .eq('week_type', weekType)
        .gt('expires_at', now.toISOString())
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      return data as CachedSchedule
    } catch (error) {
      console.error('Error getting cached schedule:', error)
      return null
    }
  }

  // Store schedule data in cache
  static async setCachedSchedule(weekType: 'current' | 'next', schedule: Record<string, unknown>): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const now = new Date()
      const expiresAt = new Date(now.getTime() + (this.CACHE_DURATION_MINUTES * 60 * 1000))
      
      const cacheData = {
        week_type: weekType,
        week_number: this.extractWeekNumber(schedule.current_week),
        week_display: schedule.current_week,
        games: schedule.games,
        last_updated: now.toISOString(),
        expires_at: expiresAt.toISOString()
      }

      // Upsert to replace existing cache entry
      const { error } = await supabase
        .from('schedule_cache')
        .upsert(cacheData, { onConflict: 'week_type' })

      if (error) {
        console.error('Error setting cached schedule:', error)
      } else {
        console.log(`Cached ${weekType} week schedule, expires at ${expiresAt.toISOString()}`)
      }
    } catch (error) {
      console.error('Error setting cached schedule:', error)
    }
  }

  // Extract week number from display string
  private static extractWeekNumber(weekDisplay: string): number {
    const match = weekDisplay.match(/Week (\d+)/i)
    return match ? parseInt(match[1]) : 1
  }

  // Check if cache is valid
  static isCacheValid(cachedSchedule: CachedSchedule | null): boolean {
    if (!cachedSchedule) return false
    
    const now = new Date()
    const expiresAt = new Date(cachedSchedule.expires_at)
    
    return now < expiresAt
  }

  // Clear expired cache entries
  static async clearExpiredCache(): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const now = new Date()
      const { error } = await supabase
        .from('schedule_cache')
        .delete()
        .lt('expires_at', now.toISOString())

      if (error) {
        console.error('Error clearing expired cache:', error)
      } else {
        console.log('Cleared expired cache entries')
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error)
    }
  }
}
