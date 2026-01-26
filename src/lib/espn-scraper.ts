// ESPN Schedule Page Scraper
// Alternative to ESPN API for fetching schedule data

import * as cheerio from 'cheerio'

export interface ScrapedGame {
  awayTeam: string
  homeTeam: string
  gameTime: string
  status: string
  awayScore?: number
  homeScore?: number
  week?: number
  season?: string
}

export class ESPNScheduleScraper {
  private baseUrl = 'https://www.espn.com/nfl/schedule'

  /**
   * Fetch and parse the ESPN schedule page
   */
  async scrapeSchedule(week?: number, season?: number): Promise<ScrapedGame[]> {
    try {
      let url = this.baseUrl
      
      // If week and season are provided, try to construct a more specific URL
      // ESPN schedule URLs can be: /nfl/schedule/_/week/{week}/seasontype/{type}
      if (week && season) {
        // Try to determine season type from week
        // This is a simplified approach - you may need to adjust based on actual ESPN URL structure
        url = `${this.baseUrl}/_/week/${week}/seasontype/2` // 2 = regular season
      }

      console.log(`Fetching ESPN schedule page: ${url}`)

      const response = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      const games: ScrapedGame[] = []

      // ESPN schedule page structure may vary, so we'll try multiple selectors
      // Look for game/matchup containers
      const gameSelectors = [
        'table tbody tr',
        '.ScheduleTables tbody tr',
        '.Table tbody tr',
        '[data-testid*="game"]',
        '.game',
        '.matchup',
        'tr[class*="Table"]'
      ]

      let foundGames = false

      for (const selector of gameSelectors) {
        const rows = $(selector)
        
        if (rows.length > 0) {
          console.log(`Found ${rows.length} potential game rows with selector: ${selector}`)
          
          rows.each((_, element) => {
            const $row = $(element)
            const game = this.parseGameRow($row, $)
            
            if (game) {
              games.push(game)
              foundGames = true
            }
          })

          if (foundGames) break
        }
      }

      // Alternative: Look for embedded JSON data
      if (games.length === 0) {
        const jsonData = this.extractEmbeddedJSON(html)
        if (jsonData) {
          return this.parseJSONData(jsonData)
        }
      }

      console.log(`Scraped ${games.length} games from ESPN schedule page`)
      return games

    } catch (error) {
      console.error('Error scraping ESPN schedule page:', error)
      throw error
    }
  }

  /**
   * Parse a game row from the schedule table
   */
  private parseGameRow($row: cheerio.Cheerio<cheerio.Element>, $: cheerio.Root): ScrapedGame | null {
    try {
      // Look for team links - ESPN uses links like /nfl/team/_/name/{abbrev}/{team-name}
      const teamLinks = $row.find('a[href*="/nfl/team/_/name/"]')
      
      if (teamLinks.length >= 2) {
        const awayLink = teamLinks.eq(0).attr('href') || ''
        const homeLink = teamLinks.eq(1).attr('href') || ''
        
        // Extract abbreviation from URL: /nfl/team/_/name/{abbrev}/
        const awayMatch = awayLink.match(/\/name\/([a-z]+)\//i)
        const homeMatch = homeLink.match(/\/name\/([a-z]+)\//i)
        
        if (awayMatch && homeMatch) {
          const awayTeam = awayMatch[1].toUpperCase()
          const homeTeam = homeMatch[1].toUpperCase()
          
          // Map common variations
          const teamMap: { [key: string]: string } = {
            'WSH': 'WAS',
            'LAR': 'LAR',
            'LAC': 'LAC'
          }
          
          const finalAway = teamMap[awayTeam] || awayTeam
          const finalHome = teamMap[homeTeam] || homeTeam
          
          // Try to extract game time
          const text = $row.text()
          const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|ET|CT|MT|PT))/i)
          const gameTime = timeMatch ? timeMatch[1] : ''
          
          // Try to extract scores
          const scoreMatch = text.match(/(\d+)\s*-\s*(\d+)/)
          const awayScore = scoreMatch ? parseInt(scoreMatch[1]) : undefined
          const homeScore = scoreMatch ? parseInt(scoreMatch[2]) : undefined
          
          // Determine status
          let status = 'scheduled'
          if (text.includes('FINAL') || text.includes('Final')) {
            status = 'final'
          } else if (text.includes('LIVE') || text.includes('Q') || text.includes('OT')) {
            status = 'live'
          }
          
          return {
            awayTeam: finalAway,
            homeTeam: finalHome,
            gameTime,
            status,
            awayScore,
            homeScore
          }
        }
      }
      
      // Fallback: Try to extract team names from text
      const text = $row.text()
      const teamPattern = /([A-Z]{2,3})\s+@\s+([A-Z]{2,3})|([A-Z]{2,3})\s+vs\s+([A-Z]{2,3})/i
      const match = text.match(teamPattern)

      if (!match) {
        return null
      }

      const awayTeam = match[1] || match[3] || ''
      const homeTeam = match[2] || match[4] || ''

      // Try to extract game time
      const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM|ET|CT|MT|PT))/i)
      const gameTime = timeMatch ? timeMatch[1] : ''

      // Try to extract scores
      const scoreMatch = text.match(/(\d+)\s*-\s*(\d+)/)
      const awayScore = scoreMatch ? parseInt(scoreMatch[1]) : undefined
      const homeScore = scoreMatch ? parseInt(scoreMatch[2]) : undefined

      // Determine status
      let status = 'scheduled'
      if (text.includes('FINAL') || text.includes('Final')) {
        status = 'final'
      } else if (text.includes('LIVE') || text.includes('Q') || text.includes('OT')) {
        status = 'live'
      }

      return {
        awayTeam: awayTeam.trim(),
        homeTeam: homeTeam.trim(),
        gameTime,
        status,
        awayScore,
        homeScore
      }
    } catch (error) {
      console.error('Error parsing game row:', error)
      return null
    }
  }

  /**
   * Extract embedded JSON data from the page
   */
  private extractEmbeddedJSON(html: string): any { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      // Look for common patterns of embedded JSON
      const patterns = [
        /window\['__espnfitt__'\]\s*=\s*({.+?});/s,
        /window\.__espnfitt__\s*=\s*({.+?});/s,
        /<script[^>]*id="__NEXT_DATA__"[^>]*>({.+?})<\/script>/s,
        /"pageProps":\s*({.+?})/s
      ]

      for (const pattern of patterns) {
        const match = html.match(pattern)
        if (match) {
          try {
            return JSON.parse(match[1])
          } catch (e) {
            console.log('Could not parse JSON from pattern:', e)
          }
        }
      }
    } catch (error) {
      console.error('Error extracting embedded JSON:', error)
    }

    return null
  }

  /**
   * Parse JSON data structure from ESPN
   */
  private parseJSONData(data: any): ScrapedGame[] { // eslint-disable-line @typescript-eslint/no-explicit-any
    const games: ScrapedGame[] = []

    try {
      // Navigate through common ESPN JSON structures
      // This structure may vary, so we'll try multiple paths
      const possiblePaths = [
        data.page?.content?.schedule?.events,
        data.page?.content?.scoreboard?.events,
        data.events,
        data.scoreboard?.events,
        data.schedule?.events
      ]

      for (const events of possiblePaths) {
        if (Array.isArray(events) && events.length > 0) {
          for (const event of events) {
            const game = this.parseJSONEvent(event)
            if (game) {
              games.push(game)
            }
          }
          break
        }
      }
    } catch (error) {
      console.error('Error parsing JSON data:', error)
    }

    return games
  }

  /**
   * Parse a single event from JSON data
   */
  private parseJSONEvent(event: any): ScrapedGame | null { // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const competition = event.competitions?.[0]
      if (!competition) return null

      const awayTeam = competition.competitors?.find((c: any) => c.homeAway === 'away')?.team // eslint-disable-line @typescript-eslint/no-explicit-any
      const homeTeam = competition.competitors?.find((c: any) => c.homeAway === 'home')?.team // eslint-disable-line @typescript-eslint/no-explicit-any

      if (!awayTeam || !homeTeam) return null

      const status = competition.status?.type?.state || 'scheduled'
      let gameStatus = 'scheduled'
      if (status === 'post') {
        gameStatus = 'final'
      } else if (status === 'in') {
        gameStatus = 'live'
      }

      return {
        awayTeam: awayTeam.abbreviation || awayTeam.name,
        homeTeam: homeTeam.abbreviation || homeTeam.name,
        gameTime: competition.date || '',
        status: gameStatus,
        awayScore: awayTeam.score ? parseInt(awayTeam.score) : undefined,
        homeScore: homeTeam.score ? parseInt(homeTeam.score) : undefined,
        week: event.week?.number,
        season: event.season?.type === 1 ? 'PRE' : event.season?.type === 2 ? 'REG' : 'POST'
      }
    } catch (error) {
      console.error('Error parsing JSON event:', error)
      return null
    }
  }
}

export const espnScheduleScraper = new ESPNScheduleScraper()
