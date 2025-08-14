import { NextRequest, NextResponse } from 'next/server'
import { chatgptNFLService } from '@/lib/chatgpt-nfl-service'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing ChatGPT Raw Response...')
    
    // Get the raw response from ChatGPT
    const apiKey = process.env.OPENAI_API_KEY || ''
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Please visit https://www.nfl.com/schedules/ and extract the current preseason week's NFL schedule for 2025. 

The page should show "NFL 2025 - PRESEASON WEEK X Schedule" at the top. Look for the current preseason week (likely Preseason Week 2 or 3 based on the date).

Return the data in this exact JSON format:
{
  "current_week": "Preseason Week X",
  "games": [
    {
      "id": "unique-id",
      "away_team": "Team Name",
      "home_team": "Team Name", 
      "game_time": "2025-MM-DDTHH:MM:SSZ",
      "day": "Day of week",
      "status": "scheduled",
      "venue": "Stadium Name",
      "network": "TV Network"
    }
  ]
}

Extract all preseason games shown on the current week's schedule. Make sure all game times are in 2025. Use proper team names (e.g., "Bills", "Dolphins", etc.). Convert game times to ISO format with 2025 dates. If venue or network info is not available, omit those fields.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
              body: JSON.stringify({
          model: 'gpt-4o', // Use GPT-4o
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      })
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const content = data.choices[0]?.message?.content

    if (!content) {
      throw new Error('No response content from ChatGPT')
    }

    return NextResponse.json({
      success: true,
      raw_response: content,
      response_length: content.length,
      first_500_chars: content.substring(0, 500),
      last_500_chars: content.substring(content.length - 500)
    })
    
  } catch (error) {
    console.error('ChatGPT raw test failed:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      raw_response: null
    }, { status: 500 })
  }
}
