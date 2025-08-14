// ChatGPT NFL Data Service
// Uses ChatGPT to extract NFL schedule data from NFL.com

interface ChatGPTNFLGame {
  id: string
  away_team: string
  home_team: string
  game_time: string
  day: string
  status: string
  venue?: string
  network?: string
}

interface ChatGPTNFLSchedule {
  current_week: string
  games: ChatGPTNFLGame[]
  last_updated: string
}

export class ChatGPTNFLService {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1/chat/completions'

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      console.warn('OPENAI_API_KEY not found in environment variables')
    }
  }

  // Get NFL schedule data using ChatGPT
  async getCurrentWeekSchedule(): Promise<ChatGPTNFLSchedule> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      const prompt = `GOAL:
I NEED A LIST OF NFL GAMES ON A WEEKLY BASIS WITH THURSDAY BEING THE FIRST DAY OF THE WEEK AND WEDNESDAY BEING THE LAST DAY OF THE WEEK.

RETURN FORMAT:
PLEASE RETURN A TABLE THAT INCLUDES THE HOME TEAM & RECORD, AWAY TEAM & RECORD, TIME OF THE GAME, DATE OF THE GAME, AND CITY/LOCATION THE GAME IS BEING PLAYED.

WARNING:
BE CAREFUL TO MAKE SURE YOU DOUBLE CHECK ALL MATCHUPS AND PROVIDE THE CORRECT TIME AND DATE. ANY WRONG INFORMATION IS UNACCEPTABLE, AND CAN CAUSE SERIOUS PROBLEMS.

CONTEXT:
WE ARE USING THIS DATA AS A WAY TO WAGER OUR LOSER POOL. WE NEED TO BE ABLE TO PICK THE LOSER OF EACH MATCHUP ON A WEEK OVER WEEK BASIS FOR THE LOSER POOL.

Please visit https://www.nfl.com/schedules/ and extract the current preseason week's NFL schedule for 2025. 

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

Extract all preseason games shown on the current week's schedule. Make sure all game times are in 2025. Use proper team names (e.g., "Bills", "Dolphins", etc.). Convert game times to ISO format with 2025 dates. If venue or network info is not available, omit those fields.

IMPORTANT: Return ONLY valid JSON without any comments, explanations, or markdown formatting. Do not include "//" comments or ```json``` blocks.`

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
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

      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in ChatGPT response')
      }

      const scheduleData = JSON.parse(jsonMatch[0])
      
      // Validate the response structure
      if (!scheduleData.current_week || !Array.isArray(scheduleData.games)) {
        throw new Error('Invalid schedule data structure from ChatGPT')
      }

      return {
        current_week: scheduleData.current_week,
        games: scheduleData.games,
        last_updated: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error getting NFL schedule via ChatGPT:', error)
      throw error
    }
  }

  // Get next week's NFL schedule using ChatGPT
  async getNextWeekSchedule(): Promise<ChatGPTNFLSchedule> {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not configured')
      }

      const prompt = `GOAL:
I NEED A LIST OF NFL GAMES ON A WEEKLY BASIS WITH THURSDAY BEING THE FIRST DAY OF THE WEEK AND WEDNESDAY BEING THE LAST DAY OF THE WEEK.

RETURN FORMAT:
PLEASE RETURN A TABLE THAT INCLUDES THE HOME TEAM & RECORD, AWAY TEAM & RECORD, TIME OF THE GAME, DATE OF THE GAME, AND CITY/LOCATION THE GAME IS BEING PLAYED.

WARNING:
BE CAREFUL TO MAKE SURE YOU DOUBLE CHECK ALL MATCHUPS AND PROVIDE THE CORRECT TIME AND DATE. ANY WRONG INFORMATION IS UNACCEPTABLE, AND CAN CAUSE SERIOUS PROBLEMS.

CONTEXT:
WE ARE USING THIS DATA AS A WAY TO WAGER OUR LOSER POOL. WE NEED TO BE ABLE TO PICK THE LOSER OF EACH MATCHUP ON A WEEK OVER WEEK BASIS FOR THE LOSER POOL.

Please visit https://www.nfl.com/schedules/ and navigate to Preseason Week 4 schedule for 2025. 

On the NFL.com schedules page, look for navigation options to go to "PRESEASON WEEK 4" or click through to the next week's schedule. The page should show "NFL 2025 - PRESEASON WEEK 4 Schedule" at the top.

Return the data in this exact JSON format:
{
  "current_week": "Preseason Week 4",
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

Extract all preseason games shown for Preseason Week 4. Make sure all game times are in 2025. Use proper team names (e.g., "Bills", "Dolphins", etc.). Convert game times to ISO format with 2025 dates. If venue or network info is not available, omit those fields.

IMPORTANT: Return ONLY valid JSON without any comments, explanations, or markdown formatting. Do not include "//" comments or ```json``` blocks.`

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
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

      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No valid JSON found in ChatGPT response')
      }

      const scheduleData = JSON.parse(jsonMatch[0])
      
      // Validate the response structure
      if (!scheduleData.current_week || !Array.isArray(scheduleData.games)) {
        throw new Error('Invalid schedule data structure from ChatGPT')
      }

      return {
        current_week: scheduleData.current_week,
        games: scheduleData.games,
        last_updated: new Date().toISOString()
      }

    } catch (error) {
      console.error('Error getting next week NFL schedule via ChatGPT:', error)
      throw error
    }
  }

  // Convert ChatGPT game to our internal format
  convertToMatchupFormat(game: ChatGPTNFLGame): any {
    return {
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: game.game_time,
      status: game.status,
      venue: game.venue,
      data_source: 'chatgpt-nfl',
      last_api_update: new Date().toISOString(),
      api_update_count: 1
    }
  }

  // Test the ChatGPT service
  async testService(): Promise<boolean> {
    try {
      const schedule = await this.getCurrentWeekSchedule()
      return schedule.games.length > 0
    } catch (error) {
      console.error('ChatGPT NFL service test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const chatgptNFLService = new ChatGPTNFLService()
