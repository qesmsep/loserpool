# NFL.com Scraping Setup

## Current Implementation

The system is currently using **mock NFL data** to simulate what we'd get from scraping [NFL.com](https://www.nfl.com/schedules/). This provides a working foundation while we implement the actual web scraping.

### ✅ What's Working

1. **Mock NFL Data Service** (`src/lib/mock-nfl-data.ts`)
   - Provides realistic preseason week 2 schedule data
   - Correctly identifies current week as "Preseason Week 2"
   - Includes 8 mock games with proper team names, times, and venues

2. **Automated Update System**
   - Processes mock data through the full pipeline
   - Integrates with weather and odds APIs
   - Updates database with new information
   - Logs all operations

3. **Rounded Background Design**
   - Updated matchup boxes with primary team colors
   - Gradient from full opacity at top to 80% opacity at bottom
   - Creates the rounded appearance you requested

### 🔄 Current Data Flow

```
Mock NFL Data → MatchupDataService → Database Update → UI Display
```

## Implementing Real NFL.com Scraping

### Option 1: Headless Browser (Recommended)

To scrape NFL.com properly, we need a headless browser since the site loads data via JavaScript. Here are the recommended approaches:

#### A. Puppeteer (Node.js)
```bash
npm install puppeteer
```

#### B. Playwright (Node.js)
```bash
npm install playwright
```

#### C. Browserless.io (Cloud Service)
- Use a cloud-based headless browser service
- More reliable for production environments

### Option 2: API Proxy Services

#### A. ScrapingBee
- Handles JavaScript rendering
- Built-in anti-bot protection bypass
- Simple API integration

#### B. ScraperAPI
- Similar to ScrapingBee
- Good for dynamic content

### Option 3: NFL.com API (If Available)

Check if NFL.com has an official API or RSS feeds that we can use instead of scraping.

## Implementation Steps

### 1. Install Headless Browser
```bash
npm install puppeteer
```

### 2. Update NFL Scraper
Replace the mock service with real scraping:

```typescript
// src/lib/nfl-scraper.ts
import puppeteer from 'puppeteer'

export class NFLScraperService {
  async getCurrentWeekSchedule(): Promise<ScrapedSchedule> {
    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()
    
    await page.goto('https://www.nfl.com/schedules/')
    await page.waitForSelector('.schedule-game', { timeout: 10000 })
    
    const games = await page.evaluate(() => {
      // Extract game data from the rendered page
      const gameElements = document.querySelectorAll('.schedule-game')
      return Array.from(gameElements).map(element => ({
        away_team: element.querySelector('.away-team')?.textContent,
        home_team: element.querySelector('.home-team')?.textContent,
        game_time: element.querySelector('.game-time')?.textContent,
        venue: element.querySelector('.venue')?.textContent,
        // ... other fields
      }))
    })
    
    await browser.close()
    return { current_week: 'Preseason Week 2', games, last_updated: new Date().toISOString() }
  }
}
```

### 3. Update Matchup Data Service
Switch from mock to real scraper:

```typescript
// src/lib/matchup-data-service.ts
async fetchNFLSchedule(): Promise<any> {
  try {
    const { nflScraperService } = await import('@/lib/nfl-scraper')
    return await nflScraperService.getCurrentWeekSchedule()
  } catch (error) {
    console.error('Error fetching NFL.com schedule:', error)
    throw error
  }
}
```

## Testing the Current System

### Test Mock Data
```bash
curl http://localhost:3000/api/test-mock-nfl
```

### Test Full Update System
```bash
curl -X POST http://localhost:3000/api/test-update-matchups
```

### Expected Output
```json
{
  "success": true,
  "current_week": "Preseason Week 2",
  "games_count": 8,
  "games": [
    {
      "id": "bills-bengals-1",
      "away_team": "Bills",
      "home_team": "Bengals",
      "game_time": "2025-08-14T19:00:00Z",
      "day": "Thursday",
      "status": "scheduled",
      "venue": "Paycor Stadium"
    }
    // ... more games
  ]
}
```

## Next Steps

1. **Choose a scraping approach** (Puppeteer recommended)
2. **Implement real NFL.com scraping** using headless browser
3. **Test with real data** to ensure accuracy
4. **Deploy to production** with proper error handling
5. **Monitor and maintain** the scraping system

## Benefits of Current Setup

- ✅ **Working foundation** - All systems are functional
- ✅ **Realistic data** - Mock data matches expected format
- ✅ **Easy to switch** - Simple to replace mock with real scraper
- ✅ **Tested pipeline** - Weather and odds integration working
- ✅ **Beautiful UI** - Rounded team color backgrounds implemented

The system is ready for real NFL.com integration whenever you're ready to implement the actual scraping!
