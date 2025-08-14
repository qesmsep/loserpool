// Enhanced NFL.com Schedule Scraper
// Scrapes the current week's schedule directly from https://www.nfl.com/schedules/

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

export class EnhancedNFLScraperService {
  private baseUrl = 'https://www.nfl.com/schedules'
  private currentYear = '2025'

  // Helper method to get the current week URL
  private getCurrentWeekUrl(): string {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00')
    const regularSeasonStart = new Date('2025-09-04T00:00:00')
    
    // If before regular season start, it's preseason
    if (now < regularSeasonStart) {
      const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
      
      let preseasonWeek = 1
      if (daysSinceStart >= 6) preseasonWeek = 2
      else if (daysSinceStart >= 13) preseasonWeek = 3
      else if (daysSinceStart >= 20) preseasonWeek = 4
      
      return `${this.baseUrl}/${this.currentYear}/PRE${preseasonWeek}/`
    }
    
    // Regular season - calculate week number
    const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const regularSeasonWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
    
    return `${this.baseUrl}/${this.currentYear}/REG${regularSeasonWeek}/`
  }

  // Helper method to get the next week URL
  private getNextWeekUrl(): string {
    const now = new Date()
    const preseasonStart = new Date('2025-08-07T00:00:00')
    const regularSeasonStart = new Date('2025-09-04T00:00:00')
    
    // If before regular season start, it's preseason
    if (now < regularSeasonStart) {
      const daysSinceStart = Math.floor((now.getTime() - preseasonStart.getTime()) / (24 * 60 * 60 * 1000))
      
      let preseasonWeek = 1
      if (daysSinceStart >= 6) preseasonWeek = 2
      else if (daysSinceStart >= 13) preseasonWeek = 3
      else if (daysSinceStart >= 20) preseasonWeek = 4
      
      // Next preseason week - but don't go beyond week 3 for preseason
      const nextPreseasonWeek = Math.min(3, preseasonWeek + 1)
      return `${this.baseUrl}/${this.currentYear}/PRE${nextPreseasonWeek}/`
    }
    
    // Regular season - calculate next week number
    const regularSeasonWeeksSinceStart = Math.floor((now.getTime() - regularSeasonStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
    const currentWeek = Math.max(1, Math.min(18, regularSeasonWeeksSinceStart + 1))
    const nextWeek = Math.min(18, currentWeek + 1)
    
    return `${this.baseUrl}/${this.currentYear}/REG${nextWeek}/`
  }

  // Get the current week's schedule from NFL.com using enhanced Puppeteer
  async getCurrentWeekSchedule(): Promise<ScrapedSchedule> {
    let browser
    try {
      console.log('Launching enhanced Puppeteer browser...')
      browser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      })
      
      const page = await browser.newPage()
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Enable request interception to block unnecessary resources
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort()
        } else {
          req.continue()
        }
      })
      
      const currentWeekUrl = this.getCurrentWeekUrl()
      console.log(`Navigating to NFL.com schedules: ${currentWeekUrl}`)
      await page.goto(currentWeekUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      })
      
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 15000 })
      
      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      console.log('Extracting schedule data with enhanced selectors...')
      const scheduleData = await page.evaluate(() => {
        // Get current week from page title or headers
        const pageTitle = document.title
        const weekMatch = pageTitle.match(/PRESEASON WEEK (\d+)/i) || 
                         pageTitle.match(/WEEK (\d+)/i)
        const currentWeek = weekMatch ? `Preseason Week ${weekMatch[1]}` : 'Current Week'
        
        console.log('Page title:', pageTitle)
        console.log('Current week detected:', currentWeek)
        
        // Enhanced selectors for finding games
        const gameSelectors = [
          // Modern NFL.com selectors
          '[data-testid*="game"]',
          '[data-testid*="matchup"]',
          '.schedule-game',
          '.game-item',
          '.matchup-item',
          // Generic selectors
          '.game',
          '.matchup',
          '.schedule-item',
          // Table-based selectors
          'tr[data-testid*="game"]',
          'tr.schedule-row',
          // List-based selectors
          'li[data-testid*="game"]',
          'li.game-item'
        ]
        
        let gameElements: Element[] = []
        for (const selector of gameSelectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            gameElements = Array.from(elements)
            console.log(`Found ${elements.length} games with selector: ${selector}`)
            break
          }
        }
        
        // If no games found with specific selectors, try broader approach
        if (gameElements.length === 0) {
          // Look for any elements containing team names
          const allElements = document.querySelectorAll('*')
          const teamPattern = /(Titans|Falcons|Chiefs|Seahawks|Dolphins|Lions|Panthers|Texans|Packers|Colts|Patriots|Vikings|Browns|Eagles|49ers|Raiders|Ravens|Cowboys|Chargers|Rams|Jets|Giants|Buccaneers|Steelers|Cardinals|Broncos|Jaguars|Saints|Bills|Bears|Bengals|Commanders)/i
          
          gameElements = Array.from(allElements).filter(el => {
            const text = el.textContent || ''
            return teamPattern.test(text) && text.length < 500 // Reasonable length for game info
          })
          
          console.log(`Found ${gameElements.length} potential game elements with team names`)
        }
        
        // Extract game data
        const games = gameElements.map((element, index) => {
          const text = element.textContent || ''
          
          // Enhanced team name extraction
          const teamNames = [
            'Titans', 'Falcons', 'Chiefs', 'Seahawks', 'Dolphins', 'Lions',
            'Panthers', 'Texans', 'Packers', 'Colts', 'Patriots', 'Vikings',
            'Browns', 'Eagles', '49ers', 'Raiders', 'Ravens', 'Cowboys',
            'Chargers', 'Rams', 'Jets', 'Giants', 'Buccaneers', 'Steelers',
            'Cardinals', 'Broncos', 'Jaguars', 'Saints', 'Bills', 'Bears',
            'Bengals', 'Commanders'
          ]
          
          let awayTeam = ''
          let homeTeam = ''
          
          // Find teams in the text
          const foundTeams = teamNames.filter(team => 
            text.includes(team)
          )
          
          if (foundTeams.length >= 2) {
            // Try to determine away vs home based on @ symbol or order
            if (text.includes('@')) {
              const parts = text.split('@')
              const beforeAt = parts[0]
              const afterAt = parts[1]
              
              awayTeam = foundTeams.find(team => beforeAt.includes(team)) || foundTeams[0]
              homeTeam = foundTeams.find(team => afterAt.includes(team)) || foundTeams[1]
            } else {
              awayTeam = foundTeams[0]
              homeTeam = foundTeams[1]
            }
          }
          
          // Extract time (look for time patterns)
          const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i
          const timeMatch = text.match(timePattern)
          let gameTime = ''
          if (timeMatch) {
            gameTime = `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`
          }
          
          // Extract day
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          const day = days.find(d => text.includes(d)) || ''
          
          // Extract venue (look for stadium names)
          const venues = [
            'Mercedes-Benz Stadium', 'Lumen Field', 'Ford Field', 'NRG Stadium',
            'Lucas Oil Stadium', 'U.S. Bank Stadium', 'Lincoln Financial Field',
            'Allegiant Stadium', 'AT&T Stadium', 'SoFi Stadium', 'MetLife Stadium',
            'Acrisure Stadium', 'Empower Field at Mile High', 'Caesars Superdome',
            'Soldier Field', 'FedExField'
          ]
          const venue = venues.find(v => text.includes(v)) || ''
          
          // Extract network
          const networks = ['NFL Network', 'CBS', 'FOX', 'NBC', 'ESPN', 'Local']
          const network = networks.find(n => text.includes(n)) || ''
          
          return {
            id: `game-${index}-${Date.now()}`,
            away_team: awayTeam,
            home_team: homeTeam,
            game_time: gameTime,
            day: day,
            status: 'scheduled',
            venue: venue || undefined,
            network: network || undefined
          }
        }).filter(game => game.away_team && game.home_team && game.away_team !== game.home_team)
        
        // Remove duplicates and filter out games without times
        const uniqueGames = games.filter((game, index, self) => 
          index === self.findIndex(g => 
            g.away_team === game.away_team && g.home_team === game.home_team
          ) && game.game_time && game.game_time.trim() !== ''
        )
        
        console.log(`Extracted ${uniqueGames.length} unique games`)
        
        return {
          current_week: currentWeek,
          games: uniqueGames,
          last_updated: new Date().toISOString()
        }
      })
      
      console.log(`Found ${scheduleData.games.length} games for ${scheduleData.current_week}`)
      return scheduleData
      
    } catch (error) {
      console.error('Error scraping NFL.com with enhanced Puppeteer:', error)
      throw new Error(`Failed to scrape NFL.com: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  // Get next week's schedule from NFL.com using enhanced Puppeteer
  async getNextWeekSchedule(): Promise<ScrapedSchedule> {
    let browser
    try {
      console.log('Launching enhanced Puppeteer browser for next week...')
      browser = await puppeteer.launch({ 
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      })
      
      const page = await browser.newPage()
      
      // Set viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
      
      // Enable request interception to block unnecessary resources
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort()
        } else {
          req.continue()
        }
      })
      
      const nextWeekUrl = this.getNextWeekUrl()
      console.log(`Navigating to NFL.com schedules for next week: ${nextWeekUrl}`)
      await page.goto(nextWeekUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 30000 
      })
      
      // Wait for content to load
      await page.waitForSelector('body', { timeout: 15000 })
      
      // No navigation needed since we're using direct URLs
      
      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      console.log('Extracting next week schedule data with enhanced selectors...')
      const scheduleData = await page.evaluate(() => {
        // Get current week from page title or headers
        const pageTitle = document.title
        const weekMatch = pageTitle.match(/PRESEASON WEEK (\d+)/i) || 
                         pageTitle.match(/WEEK (\d+)/i)
        const currentWeek = weekMatch ? `Preseason Week ${weekMatch[1]}` : 'Next Week'
        
        console.log('Page title:', pageTitle)
        console.log('Current week detected:', currentWeek)
        
        // Enhanced selectors for finding games
        const gameSelectors = [
          // Modern NFL.com selectors
          '[data-testid*="game"]',
          '[data-testid*="matchup"]',
          '.schedule-game',
          '.game-item',
          '.matchup-item',
          // Generic selectors
          '.game',
          '.matchup',
          '.schedule-item',
          // Table-based selectors
          'tr[data-testid*="game"]',
          'tr.schedule-row',
          // List-based selectors
          'li[data-testid*="game"]',
          'li.game-item'
        ]
        
        let gameElements: Element[] = []
        for (const selector of gameSelectors) {
          const elements = document.querySelectorAll(selector)
          if (elements.length > 0) {
            gameElements = Array.from(elements)
            console.log(`Found ${elements.length} games with selector: ${selector}`)
            break
          }
        }
        
        // If no games found with specific selectors, try broader approach
        if (gameElements.length === 0) {
          // Look for any elements containing team names
          const allElements = document.querySelectorAll('*')
          const teamPattern = /(Titans|Falcons|Chiefs|Seahawks|Dolphins|Lions|Panthers|Texans|Packers|Colts|Patriots|Vikings|Browns|Eagles|49ers|Raiders|Ravens|Cowboys|Chargers|Rams|Jets|Giants|Buccaneers|Steelers|Cardinals|Broncos|Jaguars|Saints|Bills|Bears|Bengals|Commanders)/i
          
          gameElements = Array.from(allElements).filter(el => {
            const text = el.textContent || ''
            return teamPattern.test(text) && text.length < 500 // Reasonable length for game info
          })
          
          console.log(`Found ${gameElements.length} potential game elements with team names`)
        }
        
        // Extract game data
        const games = gameElements.map((element, index) => {
          const text = element.textContent || ''
          
          // Enhanced team name extraction
          const teamNames = [
            'Titans', 'Falcons', 'Chiefs', 'Seahawks', 'Dolphins', 'Lions',
            'Panthers', 'Texans', 'Packers', 'Colts', 'Patriots', 'Vikings',
            'Browns', 'Eagles', '49ers', 'Raiders', 'Ravens', 'Cowboys',
            'Chargers', 'Rams', 'Jets', 'Giants', 'Buccaneers', 'Steelers',
            'Cardinals', 'Broncos', 'Jaguars', 'Saints', 'Bills', 'Bears',
            'Bengals', 'Commanders'
          ]
          
          let awayTeam = ''
          let homeTeam = ''
          
          // Find teams in the text
          const foundTeams = teamNames.filter(team => 
            text.includes(team)
          )
          
          if (foundTeams.length >= 2) {
            // Try to determine away vs home based on @ symbol or order
            if (text.includes('@')) {
              const parts = text.split('@')
              const beforeAt = parts[0]
              const afterAt = parts[1]
              
              awayTeam = foundTeams.find(team => beforeAt.includes(team)) || foundTeams[0]
              homeTeam = foundTeams.find(team => afterAt.includes(team)) || foundTeams[1]
            } else {
              awayTeam = foundTeams[0]
              homeTeam = foundTeams[1]
            }
          }
          
          // Extract time (look for time patterns)
          const timePattern = /(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)/i
          const timeMatch = text.match(timePattern)
          let gameTime = ''
          if (timeMatch) {
            gameTime = `${timeMatch[1]}:${timeMatch[2]} ${timeMatch[3].toUpperCase()}`
          }
          
          // Extract day
          const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
          const day = days.find(d => text.includes(d)) || ''
          
          // Extract venue (look for stadium names)
          const venues = [
            'Mercedes-Benz Stadium', 'Lumen Field', 'Ford Field', 'NRG Stadium',
            'Lucas Oil Stadium', 'U.S. Bank Stadium', 'Lincoln Financial Field',
            'Allegiant Stadium', 'AT&T Stadium', 'SoFi Stadium', 'MetLife Stadium',
            'Acrisure Stadium', 'Empower Field at Mile High', 'Caesars Superdome',
            'Soldier Field', 'FedExField', 'Gillette Stadium', 'M&T Bank Stadium',
            'Cleveland Browns Stadium', 'Hard Rock Stadium', 'Highmark Stadium',
            'Arrowhead Stadium', 'Lincoln Financial Field'
          ]
          const venue = venues.find(v => text.includes(v)) || ''
          
          // Extract network
          const networks = ['NFL Network', 'CBS', 'FOX', 'NBC', 'ESPN', 'Local']
          const network = networks.find(n => text.includes(n)) || ''
          
          return {
            id: `game-${index}-${Date.now()}`,
            away_team: awayTeam,
            home_team: homeTeam,
            game_time: gameTime,
            day: day,
            status: 'scheduled',
            venue: venue || undefined,
            network: network || undefined
          }
        }).filter(game => game.away_team && game.home_team && game.away_team !== game.home_team)
        
        // Remove duplicates and filter out games without times
        const uniqueGames = games.filter((game, index, self) => 
          index === self.findIndex(g => 
            g.away_team === game.away_team && g.home_team === game.home_team
          ) && game.game_time && game.game_time.trim() !== ''
        )
        
        // For next week, we want to limit to a reasonable number of games (preseason typically has 16 games per week)
        // Take only the first 16 games to ensure we're getting the correct week's games
        const limitedGames = uniqueGames.slice(0, 16)
        
        console.log(`Extracted ${limitedGames.length} games for next week (limited to first 16 to ensure correct week)`)
        
        return {
          current_week: currentWeek,
          games: limitedGames,
          last_updated: new Date().toISOString()
        }
      })
      
      console.log(`Found ${scheduleData.games.length} games for ${scheduleData.current_week}`)
      return scheduleData
      
    } catch (error) {
      console.error('Error scraping NFL.com next week with enhanced Puppeteer:', error)
      throw new Error(`Failed to scrape NFL.com next week: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  // Convert scraped game to our internal format
  convertToMatchupFormat(game: NFLGame): any {
    return {
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: game.game_time,
      status: game.status,
      venue: game.venue,
      data_source: 'nfl-scraper-enhanced',
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
      console.error('Enhanced NFL scraper test failed:', error)
      return false
    }
  }

  // Convert scraped game data to standardized matchup format
  static convertToMatchupFormat(game: NFLGame, weekNumber: number, seasonType: string): any {
    // Determine season based on week number and season type
    let season: string
    if (seasonType === 'preseason') {
      season = `PRE${weekNumber}`
    } else if (seasonType === 'regular') {
      season = `REG${weekNumber}`
    } else if (seasonType === 'postseason') {
      season = `POST${weekNumber}`
    } else {
      // Fallback: assume regular season
      season = `REG${weekNumber}`
    }

    return {
      id: game.id,
      week: weekNumber,
      season: season,
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: game.game_time,
      day: game.day,
      status: game.status,
      venue: game.venue,
      network: game.network,
      data_source: 'nfl-scraper-enhanced',
      last_api_update: new Date()
    }
  }
}

// Export a singleton instance
export const enhancedNFLScraperService = new EnhancedNFLScraperService()
