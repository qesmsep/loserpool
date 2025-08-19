import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.SPORTSDATA_API_KEY
    const baseUrl = 'https://api.sportsdata.io/v3/nfl/scores/json'
    
    // Test different endpoints
    const endpoints = [
      {
        name: 'ScoresByWeek (current)',
        url: `${baseUrl}/ScoresByWeek/2025PRE/2?key=${apiKey}`
      },
      {
        name: 'Scores (full season)',
        url: `${baseUrl}/Scores/2025PRE?key=${apiKey}`
      },
      {
        name: 'Schedules (with scores)',
        url: `${baseUrl}/Schedules/2025PRE?key=${apiKey}`
      },
      {
        name: '2024 ScoresByWeek',
        url: `${baseUrl}/ScoresByWeek/2024PRE/2?key=${apiKey}`
      }
    ]

    const results: any = {}

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint.name}...`)
        const response = await fetch(endpoint.url)
        
        if (!response.ok) {
          results[endpoint.name] = { error: `${response.status} ${response.statusText}` }
          continue
        }

        const data = await response.json()
        
        if (Array.isArray(data) && data.length > 0) {
          const sampleGame = data[0]
          results[endpoint.name] = {
            total_games: data.length,
            sample_game: {
              game: `${sampleGame.AwayTeam} @ ${sampleGame.HomeTeam}`,
              score: `${sampleGame.AwayScore}-${sampleGame.HomeScore}`,
              status: sampleGame.Status,
              date: sampleGame.Date
            },
            games_with_realistic_scores: data.filter((g: any) => 
              g.AwayScore > 10 || g.HomeScore > 10
            ).length
          }
        } else {
          results[endpoint.name] = { error: 'No data returned' }
        }
      } catch (error) {
        results[endpoint.name] = { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    console.error('Error testing endpoints:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
