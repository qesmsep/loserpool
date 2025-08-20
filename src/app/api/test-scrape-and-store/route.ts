import { NextResponse } from 'next/server'
import { EnhancedNFLScraperService } from '@/lib/nfl-scraper-enhanced'
import { ScheduleStorage } from '@/lib/schedule-storage'

export async function POST() {
  const startTime = Date.now()
  
  try {
    console.log('Starting manual NFL schedule scrape and store...')
    
    const scraper = new EnhancedNFLScraperService()
    let totalGamesStored = 0
    const errors: string[] = []

    try {
      // Scrape and store current week schedule
      console.log('Scraping current week schedule...')
      const currentWeekSchedule = await scraper.getCurrentWeekSchedule()
      await ScheduleStorage.storeSchedule('current', currentWeekSchedule)
      totalGamesStored += currentWeekSchedule.games.length
      console.log(`Stored ${currentWeekSchedule.games.length} current week games: ${currentWeekSchedule.current_week}`)
      
    } catch (error) {
      const errorMsg = `Error scraping current week: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
    }

    try {
      // Scrape and store next week schedule
      console.log('Scraping next week schedule...')
      const nextWeekSchedule = await scraper.getNextWeekSchedule()
      await ScheduleStorage.storeSchedule('next', nextWeekSchedule)
      totalGamesStored += nextWeekSchedule.games.length
      console.log(`Stored ${nextWeekSchedule.games.length} next week games: ${nextWeekSchedule.current_week}`)
      
    } catch (error) {
      const errorMsg = `Error scraping next week: ${error instanceof Error ? error.message : 'Unknown error'}`
      errors.push(errorMsg)
      console.error(errorMsg)
    }

    const executionTime = Date.now() - startTime
    console.log(`Manual scrape and store completed in ${executionTime}ms: ${totalGamesStored} total games stored`)

    return NextResponse.json({
      success: true,
      games_stored: totalGamesStored,
      execution_time_ms: executionTime,
      errors: errors.length > 0 ? errors : null
    })

  } catch (error) {
    const executionTime = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    console.error('Error in manual scrape and store:', error)
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      execution_time_ms: executionTime
    }, { status: 500 })
  }
}
