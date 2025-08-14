// NFL.com Schedule Scraper
// Scrapes the current week's schedule directly from https://www.nfl.com/schedules/

import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'

interface NFLGame {
  id: string
  away_team: string
  home_team: string
  game_time: string
  day: string
  status: string
  venue?: string
  network?: string
}

interface ScrapedSchedule {
  current_week: string
  games: NFLGame[]
  last_updated: string
}

export class NFLScraperService {
  private baseUrl = 'https://www.nfl.com/schedules'

  // Get the current week's schedule from NFL.com using Puppeteer
  async getCurrentWeekSchedule(): Promise<ScrapedSchedule> {
    let browser
    try {
      console.log('Launching Puppeteer browser...')
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      console.log('Navigating to NFL.com schedules...')
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Wait for any content to load
      await page.waitForSelector('body', { timeout: 15000 })
      
      // Take a screenshot for debugging
      await page.screenshot({ path: 'nfl-page.png' })
      
      // Wait a bit for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      console.log('Extracting schedule data...')
      const scheduleData = await page.evaluate(() => {
        // Get current week from page
        const weekElement = document.querySelector('h1, .week-title, [data-testid*="week"]')
        const currentWeek = weekElement ? weekElement.textContent?.trim() : 'Current Week'
        
        // Log the page content for debugging
        console.log('Page title:', document.title)
        console.log('Page content length:', document.body.textContent?.length)
        
        // Find game containers
        const gameSelectors = [
          '[data-testid*="game"]',
          '.schedule-game',
          '.game',
          '.matchup',
          '.schedule-item'
        ]
        
        let gameElements: Element[] = []
        for (const selector of gameSelectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            gameElements = Array.from(elements)
            break
          }
        }
        
        // Extract game data
        const games = gameElements.map((element, index) => {
          // Try to find team names
          const teamSelectors = [
            '.team-name',
            '.team',
            '[data-testid*="team"]',
            '.away-team',
            '.home-team'
          ]
          
          let awayTeam = ''
          let homeTeam = ''
          
          for (const selector of teamSelectors) {
            const teams = element.querySelectorAll(selector)
            if (teams.length >= 2) {
              awayTeam = teams[0]?.textContent?.trim() || ''
              homeTeam = teams[1]?.textContent?.trim() || ''
              break
            }
          }
          
          // If no specific team selectors found, try to extract from text
          if (!awayTeam || !homeTeam) {
            const text = element.textContent || ''
            const teamMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+@\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
            if (teamMatch) {
              awayTeam = teamMatch[1]
              homeTeam = teamMatch[2]
            }
          }
          
          // Extract game time
          const timeSelectors = [
            '.game-time',
            '.time',
            '[data-testid*="time"]',
            '.kickoff'
          ]
          
          let gameTime = ''
          for (const selector of timeSelectors) {
            const timeElement = element.querySelector(selector)
            if (timeElement) {
              gameTime = timeElement.textContent?.trim() || ''
              break
            }
          }
          
          // Extract venue
          const venueSelectors = [
            '.venue',
            '.stadium',
            '[data-testid*="venue"]'
          ]
          
          let venue = ''
          for (const selector of venueSelectors) {
            const venueElement = element.querySelector(selector)
            if (venueElement) {
              venue = venueElement.textContent?.trim() || ''
              break
            }
          }
          
          return {
            id: `game-${index}-${Date.now()}`,
            away_team: awayTeam,
            home_team: homeTeam,
            game_time: gameTime,
            day: '',
            status: 'scheduled',
            venue: venue || undefined
          }
        }).filter(game => game.away_team && game.home_team)
        
        return {
          current_week: currentWeek,
          games: games,
          last_updated: new Date().toISOString()
        }
      })
      
      console.log(`Found ${scheduleData.games.length} games for ${scheduleData.current_week}`)
      return scheduleData
      
    } catch (error) {
      console.error('Error scraping NFL.com with Puppeteer:', error)
      throw new Error(`Failed to scrape NFL.com: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  // Get next week's schedule from NFL.com using Puppeteer
  async getNextWeekSchedule(): Promise<ScrapedSchedule> {
    let browser
    try {
      console.log('Launching Puppeteer browser for next week...')
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      
      const page = await browser.newPage()
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      console.log('Navigating to NFL.com schedules for next week...')
      await page.goto(this.baseUrl, { waitUntil: 'networkidle2', timeout: 30000 })
      
      // Try to navigate to next week if there's a navigation option
      try {
        await page.waitForSelector('[data-testid*="next"], .next-week, .next', { timeout: 5000 })
        await page.click('[data-testid*="next"], .next-week, .next')
        await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for page to load
      } catch (e) {
        console.log('No next week navigation found, using current page')
      }
      
      // Wait for the schedule content to load
      await page.waitForSelector('[data-testid*="game"], .schedule-game, .game', { timeout: 15000 })
      
      console.log('Extracting next week schedule data...')
      const scheduleData = await page.evaluate(() => {
        // Get current week from page
        const weekElement = document.querySelector('h1, .week-title, [data-testid*="week"]')
        const currentWeek = weekElement ? weekElement.textContent?.trim() : 'Next Week'
        
        // Find game containers
        const gameSelectors = [
          '[data-testid*="game"]',
          '.schedule-game',
          '.game',
          '.matchup',
          '.schedule-item'
        ]
        
        let gameElements: Element[] = []
        for (const selector of gameSelectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            gameElements = Array.from(elements)
            break
          }
        }
        
        // Extract game data
        const games = gameElements.map((element, index) => {
          // Try to find team names
          const teamSelectors = [
            '.team-name',
            '.team',
            '[data-testid*="team"]',
            '.away-team',
            '.home-team'
          ]
          
          let awayTeam = ''
          let homeTeam = ''
          
          for (const selector of teamSelectors) {
            const teams = element.querySelectorAll(selector)
            if (teams.length >= 2) {
              awayTeam = teams[0]?.textContent?.trim() || ''
              homeTeam = teams[1]?.textContent?.trim() || ''
              break
            }
          }
          
          // If no specific team selectors found, try to extract from text
          if (!awayTeam || !homeTeam) {
            const text = element.textContent || ''
            const teamMatch = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+@\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
            if (teamMatch) {
              awayTeam = teamMatch[1]
              homeTeam = teamMatch[2]
            }
          }
          
          // Extract game time
          const timeSelectors = [
            '.game-time',
            '.time',
            '[data-testid*="time"]',
            '.kickoff'
          ]
          
          let gameTime = ''
          for (const selector of timeSelectors) {
            const timeElement = element.querySelector(selector)
            if (timeElement) {
              gameTime = timeElement.textContent?.trim() || ''
              break
            }
          }
          
          // Extract venue
          const venueSelectors = [
            '.venue',
            '.stadium',
            '[data-testid*="venue"]'
          ]
          
          let venue = ''
          for (const selector of venueSelectors) {
            const venueElement = element.querySelector(selector)
            if (venueElement) {
              venue = venueElement.textContent?.trim() || ''
              break
            }
          }
          
          return {
            id: `next-week-game-${index}-${Date.now()}`,
            away_team: awayTeam,
            home_team: homeTeam,
            game_time: gameTime,
            day: '',
            status: 'scheduled',
            venue: venue || undefined
          }
        }).filter(game => game.away_team && game.home_team)
        
        return {
          current_week: currentWeek,
          games: games,
          last_updated: new Date().toISOString()
        }
      })
      
      console.log(`Found ${scheduleData.games.length} games for ${scheduleData.current_week}`)
      return scheduleData
      
    } catch (error) {
      console.error('Error scraping NFL.com next week with Puppeteer:', error)
      throw new Error(`Failed to scrape NFL.com next week: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  // Parse the HTML content to extract schedule data
  private parseScheduleHTML(html: string): ScrapedSchedule {
    try {
      // Extract current week from the page title or content
      const weekMatch = html.match(/PRESEASON WEEK (\d+)|WEEK (\d+)/i)
      const currentWeek = weekMatch ? 
        (weekMatch[1] ? `Preseason Week ${weekMatch[1]}` : `Week ${weekMatch[2]}`) : 
        'Current Week'

      // For now, return a mock structure since we need to implement proper HTML parsing
      // In a real implementation, we'd use a library like cheerio or jsdom to parse the HTML
      const games: NFLGame[] = this.extractGamesFromHTML(html)

      return {
        current_week: currentWeek,
        games,
        last_updated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error parsing NFL.com HTML:', error)
      throw error
    }
  }

  // Extract games from HTML content using cheerio
  private extractGamesFromHTML(html: string): NFLGame[] {
    const games: NFLGame[] = []
    
    try {
      const $ = cheerio.load(html)
      
      console.log('Parsing NFL.com HTML...')
      
      // Look for game containers - NFL.com uses various selectors
      const selectors = [
        '[data-testid*="game"]',
        '.game',
        '.matchup',
        '.schedule-game',
        '[class*="game"]',
        '[class*="matchup"]',
        '.schedule-item',
        '.game-item'
      ]
      
      for (const selector of selectors) {
        const gameElements = $(selector)
        console.log(`Selector "${selector}" found ${gameElements.length} elements`)
        
        if (gameElements.length > 0) {
          gameElements.each((_, element) => {
            const game = this.parseGameFromElement($, element)
            if (game) {
              games.push(game)
            }
          })
          break // Use the first selector that finds games
        }
      }

      // If no games found with selectors, try text-based extraction
      if (games.length === 0) {
        console.log('No games found with selectors, trying fallback extraction...')
        games.push(...this.fallbackGameExtraction(html))
      }

      console.log(`Total games found: ${games.length}`)

    } catch (error) {
      console.error('Error extracting games from HTML:', error)
    }

    return games
  }

  // Parse individual game from cheerio element
  private parseGameFromElement($: cheerio.CheerioAPI, element: cheerio.Element): NFLGame | null {
    try {
      const $element = $(element)
      
      // Extract team names - try multiple selectors
      const teamSelectors = [
        '[data-testid*="away"]',
        '[data-testid*="home"]',
        '.away-team',
        '.home-team',
        '.team-away',
        '.team-home'
      ]
      
      let awayTeam = ''
      let homeTeam = ''
      
      // Look for away team
      for (const selector of teamSelectors) {
        const awayElement = $element.find(selector).first()
        if (awayElement.length > 0) {
          awayTeam = awayElement.text().trim()
          break
        }
      }
      
      // Look for home team
      for (const selector of teamSelectors) {
        const homeElement = $element.find(selector).first()
        if (homeElement.length > 0) {
          homeTeam = homeElement.text().trim()
          break
        }
      }
      
      // Extract game time
      const timeSelectors = [
        '[data-testid*="time"]',
        '.game-time',
        '.time',
        '.kickoff'
      ]
      
      let gameTime = ''
      for (const selector of timeSelectors) {
        const timeElement = $element.find(selector).first()
        if (timeElement.length > 0) {
          gameTime = timeElement.text().trim()
          break
        }
      }
      
      // Extract day
      const daySelectors = [
        '[data-testid*="day"]',
        '.game-day',
        '.day'
      ]
      
      let day = ''
      for (const selector of daySelectors) {
        const dayElement = $element.find(selector).first()
        if (dayElement.length > 0) {
          day = dayElement.text().trim()
          break
        }
      }
      
      // Extract venue
      const venueSelectors = [
        '[data-testid*="venue"]',
        '.venue',
        '.stadium'
      ]
      
      let venue = ''
      for (const selector of venueSelectors) {
        const venueElement = $element.find(selector).first()
        if (venueElement.length > 0) {
          venue = venueElement.text().trim()
          break
        }
      }

      if (awayTeam && homeTeam) {
        return {
          id: `${awayTeam}-${homeTeam}-${Date.now()}`,
          away_team: awayTeam,
          home_team: homeTeam,
          game_time: gameTime,
          day: day,
          status: 'scheduled',
          venue: venue || undefined
        }
      }
    } catch (error) {
      console.error('Error parsing individual game:', error)
    }

    return null
  }

  // Fallback method to extract games using different patterns
  private fallbackGameExtraction(html: string): NFLGame[] {
    const games: NFLGame[] = []
    
    try {
      console.log('Using fallback extraction...')
      
      // Look for team name patterns in the HTML
      const teamPatterns = [
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+@\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+vs\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
        /"awayTeam":"([^"]+)"/g,
        /"homeTeam":"([^"]+)"/g,
        /awayTeam:\s*"([^"]+)"/g,
        /homeTeam:\s*"([^"]+)"/g
      ]

      // Extract all potential team names
      const allTeams: string[] = []
      for (const pattern of teamPatterns) {
        const matches = html.matchAll(pattern)
        for (const match of matches) {
          if (match[1]) {
            allTeams.push(match[1].trim())
          }
        }
      }

      console.log(`Found ${allTeams.length} potential team references:`, allTeams.slice(0, 10))

      // Look for common NFL team names
      const nflTeams = [
        'Bills', 'Dolphins', 'Patriots', 'Jets',
        'Bengals', 'Browns', 'Ravens', 'Steelers',
        'Colts', 'Jaguars', 'Texans', 'Titans',
        'Broncos', 'Chiefs', 'Raiders', 'Chargers',
        'Cowboys', 'Giants', 'Eagles', 'Commanders',
        'Bears', 'Lions', 'Packers', 'Vikings',
        'Falcons', 'Panthers', 'Saints', 'Buccaneers',
        'Cardinals', 'Rams', '49ers', 'Seahawks'
      ]

      // Find pairs of teams that might be playing each other
      const foundTeams = allTeams.filter(team => 
        nflTeams.some(nflTeam => 
          team.toLowerCase().includes(nflTeam.toLowerCase())
        )
      )

      console.log(`Found ${foundTeams.length} NFL team references:`, foundTeams)

      // Create mock games for testing (since we can't easily pair teams from text)
      if (foundTeams.length >= 2) {
        for (let i = 0; i < Math.min(foundTeams.length - 1, 5); i += 2) {
          games.push({
            id: `${foundTeams[i]}-${foundTeams[i+1]}-${Date.now()}`,
            away_team: foundTeams[i],
            home_team: foundTeams[i+1],
            game_time: 'TBD',
            day: 'TBD',
            status: 'scheduled'
          })
        }
      }

    } catch (error) {
      console.error('Error in fallback game extraction:', error)
    }

    return games
  }

  // Convert scraped game to our internal format
  convertToMatchupFormat(game: NFLGame): any {
    return {
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: game.game_time,
      status: game.status,
      venue: game.venue,
      data_source: 'nfl.com',
      last_api_update: new Date().toISOString(),
      api_update_count: 1
    }
  }

  // Test the scraper
  async testScraper(): Promise<boolean> {
    try {
      const schedule = await this.getCurrentWeekSchedule()
      return schedule.games.length > 0
    } catch (error) {
      console.error('NFL scraper test failed:', error)
      return false
    }
  }
}

// Export a singleton instance
export const nflScraperService = new NFLScraperService()
