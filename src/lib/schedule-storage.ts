import { createServerSupabaseClient } from './supabase-server'

interface StoredSchedule {
  id: string
  week_type: 'current' | 'next'
  week_number: number
  week_display: string
  games: Array<Record<string, unknown>>
  last_updated: string
  data_source: string
}

export class ScheduleStorage {
  // Store schedule data in database
  static async storeSchedule(weekType: 'current' | 'next', schedule: Record<string, unknown>): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const now = new Date()
      const weekNumber = this.extractWeekNumber(schedule.current_week)
      
      const scheduleData = {
        week_type: weekType,
        week_number: weekNumber,
        week_display: schedule.current_week,
        games: schedule.games,
        last_updated: now.toISOString(),
        data_source: 'nfl-scraper-enhanced'
      }

      // Upsert to replace existing schedule entry
      const { error } = await supabase
        .from('stored_schedules')
        .upsert(scheduleData, { onConflict: 'week_type' })

      if (error) {
        console.error('Error storing schedule:', error)
        throw error
      } else {
        console.log(`Stored ${weekType} week schedule: ${schedule.current_week} with ${schedule.games.length} games`)
      }
    } catch (error) {
      console.error('Error storing schedule:', error)
      throw error
    }
  }

  // Get stored schedule data
  static async getStoredSchedule(weekType: 'current' | 'next'): Promise<StoredSchedule | null> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const { data, error } = await supabase
        .from('stored_schedules')
        .select('*')
        .eq('week_type', weekType)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single()

      if (error || !data) {
        return null
      }

      return data as StoredSchedule
    } catch (error) {
      console.error('Error getting stored schedule:', error)
      return null
    }
  }

  // Check if stored schedule is recent (within 1 hour)
  static isScheduleRecent(storedSchedule: StoredSchedule | null): boolean {
    if (!storedSchedule) return false
    
    const now = new Date()
    const lastUpdated = new Date(storedSchedule.last_updated)
    const hoursSinceUpdate = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
    
    return hoursSinceUpdate < 1 // Consider recent if less than 1 hour old
  }

  // Extract week number from display string
  private static extractWeekNumber(weekDisplay: string): number {
    const match = weekDisplay.match(/Week (\d+)/i)
    return match ? parseInt(match[1]) : 1
  }

  // Get all stored schedules
  static async getAllStoredSchedules(): Promise<StoredSchedule[]> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const { data, error } = await supabase
        .from('stored_schedules')
        .select('*')
        .order('week_type', { ascending: true })

      if (error) {
        console.error('Error getting all stored schedules:', error)
        return []
      }

      return data as StoredSchedule[]
    } catch (error) {
      console.error('Error getting all stored schedules:', error)
      return []
    }
  }

  // Clear old stored schedules (older than 24 hours)
  static async clearOldSchedules(): Promise<void> {
    try {
      const supabase = await createServerSupabaseClient()
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const { error } = await supabase
        .from('stored_schedules')
        .delete()
        .lt('last_updated', yesterday.toISOString())

      if (error) {
        console.error('Error clearing old schedules:', error)
      } else {
        console.log('Cleared old stored schedules')
      }
    } catch (error) {
      console.error('Error clearing old schedules:', error)
    }
  }
}
