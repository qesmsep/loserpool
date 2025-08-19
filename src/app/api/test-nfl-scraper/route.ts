import { NextRequest, NextResponse } from 'next/server'
import { nflScraper } from '@/lib/nfl-scraper'

export async function GET() {
  try {
    console.log('Testing NFL.com scraper...')

    // Try to scrape 2025 Preseason Week 2
    const games = await nflScraper.scrapePreseasonWeek(2025, 2)
    
    return NextResponse.json({
      success: true,
      total_games: games.length,
      games: games,
      message: 'NFL.com scraping completed'
    })

  } catch (error) {
    console.error('Error testing NFL.com scraper:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'NFL.com scraping failed'
    }, { status: 500 })
  }
}
