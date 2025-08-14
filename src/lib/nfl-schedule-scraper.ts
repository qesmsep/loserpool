import puppeteer from 'puppeteer'

interface NFLGame {
  id: string
  away_team: string
  home_team: string
  game_time: string
  day: string
  date: string
  status: string
  venue?: string
  network?: string
}

interface ScrapedSchedule {
  current_week: string
  week_number: number
  season_type: 'PRE' | 'REG' | 'POST'
  games: NFLGame[]
  last_updated: string
}

export class NFLScheduleScraper {
  private baseUrl = 'https://www.nfl.com/schedules'
  private currentYear = '2025'

  // Scrape main schedule page to determine current week
  async getCurrentWeekInfo(): Promise<{ currentWeek: string; weekNumber: number; seasonType: 'PRE' | 'REG' | 'POST' }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      // Block unnecessary resources
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort()
        } else {
          req.continue()
        }
      })

      console.log('Navigating to main NFL schedule page...')
      await page.goto(this.baseUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('body', { timeout: 15000 })
      await new Promise(resolve => setTimeout(resolve, 3000))

      const weekInfo = await page.evaluate(() => {
        const pageTitle = document.title
        console.log('Page title:', pageTitle)

        // Extract week info from title
        let currentWeek = 'Unknown Week'
        let weekNumber = 1
        let seasonType: 'PRE' | 'REG' = 'PRE'

        // Match patterns like "PRESEASON WEEK 2" or "WEEK 1"
        const preseasonMatch = pageTitle.match(/PRESEASON WEEK (\d+)/i)
        const regularMatch = pageTitle.match(/WEEK (\d+)/i)

        if (preseasonMatch) {
          currentWeek = `Preseason Week ${preseasonMatch[1]}`
          weekNumber = parseInt(preseasonMatch[1])
          seasonType = 'PRE'
        } else if (regularMatch) {
          currentWeek = `Week ${regularMatch[1]}`
          weekNumber = parseInt(regularMatch[1])
          seasonType = 'REG'
        }

        return { currentWeek, weekNumber, seasonType }
      })

      console.log(`Current week detected: ${weekInfo.currentWeek} (${weekInfo.seasonType}${weekInfo.weekNumber})`)
      return weekInfo

    } finally {
      await browser.close()
    }
  }

  // Get next week info based on current week
  getNextWeekInfo(currentWeek: number, seasonType: 'PRE' | 'REG' | 'POST'): { next_week: string; next_week_number: number; next_season_type: 'PRE' | 'REG' | 'POST' } {
    let nextWeekNumber: number
    let nextSeasonType: 'PRE' | 'REG' | 'POST' = seasonType

    if (seasonType === 'PRE') {
      if (currentWeek < 3) {
        // Still in preseason
        nextWeekNumber = currentWeek + 1
        nextSeasonType = 'PRE'
      } else {
        // Move to regular season
        nextWeekNumber = 1
        nextSeasonType = 'REG'
      }
    } else {
      // Regular season
      if (currentWeek < 18) {
        nextWeekNumber = currentWeek + 1
        nextSeasonType = 'REG'
      } else {
        // End of regular season
        nextWeekNumber = 1
        nextSeasonType = 'REG' // Could be playoffs, but keeping as REG for now
      }
    }

    const nextWeek = nextSeasonType === 'PRE' ? `Preseason Week ${nextWeekNumber}` : `Week ${nextWeekNumber}`
    
    return {
      next_week: nextWeek,
      next_week_number: nextWeekNumber,
      next_season_type: nextSeasonType
    }
  }

  // Scrape schedule for a specific week
  async scrapeWeekSchedule(weekNumber: number, seasonType: 'PRE' | 'REG' | 'POST'): Promise<ScrapedSchedule> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })

    try {
      const page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

      // Block unnecessary resources
      await page.setRequestInterception(true)
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
          req.abort()
        } else {
          req.continue()
        }
      })

      const weekUrl = `${this.baseUrl}/${this.currentYear}/${seasonType}${weekNumber}/`
      console.log(`Scraping schedule from: ${weekUrl}`)
      
      await page.goto(weekUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForSelector('body', { timeout: 15000 })
      
      // Wait for game containers to load dynamically
      try {
        await page.waitForSelector('.nfl-c-matchup-strip', { timeout: 20000 })
        console.log('Found .nfl-c-matchup-strip elements')
      } catch (error) {
        console.log('No .nfl-c-matchup-strip elements found, trying alternative selectors...')
        try {
          await page.waitForSelector('[class*="matchup-strip"]', { timeout: 10000 })
          console.log('Found [class*="matchup-strip"] elements')
        } catch (error2) {
          console.log('No matchup-strip elements found, waiting for any dynamic content...')
          await new Promise(resolve => setTimeout(resolve, 15000)) // Wait longer for dynamic content
        }
      }

      const scheduleData = await page.evaluate((weekNumber, seasonType) => {
        // Use the actual parameters passed to the function
        const currentWeek = seasonType === 'PRE' ? `Preseason Week ${weekNumber}` : `Week ${weekNumber}`

        // First, try to find JSON data in data-json-module attributes
        const jsonModules = document.querySelectorAll('[data-json-module]')
        console.log(`Found ${jsonModules.length} elements with data-json-module`)
        
        let scheduleDataFromJson = null
        for (const module of jsonModules) {
          try {
            const jsonData = JSON.parse(module.getAttribute('data-json-module') || '{}')
            if (jsonData.SeasonType && jsonData.SeasonType.includes('REG')) {
              console.log('Found schedule JSON data:', jsonData)
              scheduleDataFromJson = jsonData
              break
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
        
        // Look for NFL.com game containers using proper selectors
        const gameContainers = document.querySelectorAll('.nfl-c-matchup-strip')
        console.log(`Found ${gameContainers.length} game containers with .nfl-c-matchup-strip`)
        
        // Also try alternative selectors
        const alternativeContainers = document.querySelectorAll('[class*="matchup-strip"]')
        console.log(`Found ${alternativeContainers.length} game containers with [class*="matchup-strip"]`)
        
        // Use whichever selector found more containers
        const containers = gameContainers.length > 0 ? gameContainers : alternativeContainers
        console.log(`Using ${containers.length} containers for processing`)
        
        const allGames: any[] = []
        
        // Process each game container
        containers.forEach((container, index) => {
          // Get the date header that precedes this game
          let dateHeader = ''
          let currentElement = container.previousElementSibling
          while (currentElement && !dateHeader) {
            if (currentElement.tagName === 'H2' && currentElement.classList.contains('d3-o-section-title')) {
              dateHeader = currentElement.textContent || ''
              break
            }
            currentElement = currentElement.previousElementSibling
          }
          
          // Extract time from the container
          const timeElement = container.querySelector('.nfl-c-matchup-strip_date-time')
          const timezoneElement = container.querySelector('.nfl-c-matchup-strip_date-timezone')
          const networkElement = container.querySelector('.nfl-c-matchup-strip_networks')
          
          const gameTime = timeElement ? timeElement.textContent?.trim() : ''
          const timezone = timezoneElement ? timezoneElement.textContent?.trim() : ''
          const network = networkElement ? networkElement.textContent?.trim() : ''
          
          // Extract team information
          const teamElements = container.querySelectorAll('.nfl-c-matchup-strip_team')
          const teams: string[] = []
          
          teamElements.forEach(teamElement => {
            const fullNameElement = teamElement.querySelector('.nfl-c-matchup-strip_team-fullname')
            if (fullNameElement) {
              teams.push(fullNameElement.textContent?.trim() || '')
            }
          })
          
          // Create game object if we have valid data
          if (teams.length === 2 && gameTime) {
            allGames.push({
              id: `game-${index}-${Date.now()}`,
              away_team: teams[0],
              home_team: teams[1],
              game_time: `${gameTime} ${timezone}`.trim(),
              network: network,
              day: dateHeader.split(',')[0] || '',
              date: dateHeader,
              status: 'scheduled'
            })
          }
        })
        
        // Remove duplicates based on team combination
        const uniqueGames = allGames.filter((game, index, self) => {
          // Must have both teams
          if (!game.away_team || !game.home_team) return false
          
          // Must have different teams
          if (game.away_team === game.home_team) return false
          
          // Remove duplicates based on team combination (regardless of order)
          const isDuplicate = self.findIndex(g => 
            (g.away_team === game.away_team && g.home_team === game.home_team) ||
            (g.away_team === game.home_team && g.home_team === game.away_team)
          ) < index
          
          return !isDuplicate
        })
        
                console.log(`Found ${uniqueGames.length} unique games from ${allGames.length} total games`)
        
        // Debug: Log the actual games data
        console.log('Raw games data:', JSON.stringify(allGames, null, 2))
        console.log('Unique games data:', JSON.stringify(uniqueGames, null, 2))
        
        // If no games found, log what elements are available
        if (uniqueGames.length === 0) {
          console.log('No games found. Debugging available elements...')
          
          // Check for any elements with 'matchup' in the class name
          const matchupElements = document.querySelectorAll('[class*="matchup"]')
          console.log(`Found ${matchupElements.length} elements with 'matchup' in class name`)
          
          // Check for any elements with 'game' in the class name
          const gameElements = document.querySelectorAll('[class*="game"]')
          console.log(`Found ${gameElements.length} elements with 'game' in class name`)
          
          // Check for any elements with 'schedule' in the class name
          const scheduleElements = document.querySelectorAll('[class*="schedule"]')
          console.log(`Found ${scheduleElements.length} elements with 'schedule' in class name`)
          
          // Check for any elements with 'team' in the class name
          const teamElements = document.querySelectorAll('[class*="team"]')
          console.log(`Found ${teamElements.length} elements with 'team' in class name`)
          
          // Log the page title and some basic info
          console.log('Page title:', document.title)
          console.log('Page URL:', window.location.href)
          
          // Log the first few elements to see what's available
          if (matchupElements.length > 0) {
            console.log('Sample matchup element:', matchupElements[0].outerHTML.substring(0, 200))
          }
          
          // Check if there are any links to games
          const gameLinks = document.querySelectorAll('a[href*="games"]')
          console.log(`Found ${gameLinks.length} links with 'games' in href`)
          
          if (gameLinks.length > 0) {
            console.log('Sample game link:', (gameLinks[0] as HTMLAnchorElement).href)
          }
        }

        return {
          current_week: currentWeek,
          week_number: weekNumber,
          season_type: seasonType,
          games: uniqueGames,
          last_updated: new Date().toISOString()
        }
      }, weekNumber, seasonType)

      console.log(`Found ${scheduleData.games.length} games for ${scheduleData.current_week}`)
      return scheduleData

    } finally {
      await browser.close()
    }
  }

  // Convert scraped game to matchup format for database
  static convertToMatchupFormat(game: NFLGame, weekNumber: number, seasonType: string): any {
    // Determine season based on season type
    let season: string
    if (seasonType === 'PRE') {
      season = `PRE${weekNumber}`
    } else if (seasonType === 'REG') {
      season = `REG${weekNumber}`
    } else if (seasonType === 'POST') {
      season = `POST${weekNumber}`
    } else {
      // Fallback: assume regular season
      season = `REG${weekNumber}`
    }

    // Convert game time string to a proper timestamp
    // Handle TBD games (games without time) and games with specific times
    const today = new Date()
    const gameTimeString = game.game_time // e.g., "7:00 PM" or empty for TBD
    
    // Check if this is a TBD game (no time specified)
    if (!gameTimeString || gameTimeString.trim() === '') {
      // For TBD games, use a placeholder timestamp and mark status as scheduled
      return {
        week: weekNumber.toString(),
        season: season,
        away_team: game.away_team,
        home_team: game.home_team,
        game_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString(), // Default to noon
        status: 'scheduled',
        venue: game.venue || null,
        data_source: 'nfl-schedule-scraper',
        last_api_update: new Date().toISOString()
      }
    }
    
    // Parse the time and create a timestamp for today
    const timeMatch = gameTimeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
    if (timeMatch) {
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const period = timeMatch[3].toUpperCase()
      
      // Convert to 24-hour format
      if (period === 'PM' && hours !== 12) {
        hours += 12
      } else if (period === 'AM' && hours === 12) {
        hours = 0
      }
      
      // Create a timestamp for today with the game time
      const gameTimestamp = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)
      
      return {
        week: weekNumber.toString(),
        season: season,
        away_team: game.away_team,
        home_team: game.home_team,
        game_time: gameTimestamp.toISOString(),
        status: game.status,
        venue: game.venue || null,
        data_source: 'nfl-schedule-scraper',
        last_api_update: new Date().toISOString()
      }
    }
    
    // Fallback if time parsing fails
    return {
      week: weekNumber.toString(),
      season: season,
      away_team: game.away_team,
      home_team: game.home_team,
      game_time: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0).toISOString(), // Default to noon
      status: 'scheduled',
      venue: game.venue || null,
      data_source: 'nfl-schedule-scraper',
      last_api_update: new Date().toISOString()
    }
  }
}


