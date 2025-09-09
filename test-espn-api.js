// Test ESPN API for NY Giants vs Washington Commanders
// Run this with: node test-espn-api.js

const fetch = require('node-fetch');

async function testESPNAPI() {
  try {
    console.log('Testing ESPN API for NY Giants vs Washington Commanders...\n');
    
    // Test different possible team name combinations
    const teamCombinations = [
      { away: 'NYG', home: 'WAS' },
      { away: 'WAS', home: 'NYG' },
      { away: 'New York Giants', home: 'Washington Commanders' },
      { away: 'Washington Commanders', home: 'New York Giants' },
      { away: 'Giants', home: 'Commanders' },
      { away: 'Commanders', home: 'Giants' }
    ];
    
    // Test different weeks and season types
    const weeks = [1, 2, 3];
    const seasonTypes = ['PRE', 'REG', 'POST'];
    const year = 2025;
    
    for (const week of weeks) {
      for (const seasonType of seasonTypes) {
        console.log(`\n=== Testing Week ${week}, ${seasonType} Season ===`);
        
        const seasonTypeMap = {
          'PRE': '1',
          'REG': '2', 
          'POST': '3'
        };
        
        const espnSeasonType = seasonTypeMap[seasonType];
        const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${week}&year=${year}&seasontype=${espnSeasonType}`;
        
        console.log(`URL: ${url}`);
        
        try {
          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
          });
          
          if (!response.ok) {
            console.log(`❌ HTTP Error: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const data = await response.json();
          const events = data.events || [];
          
          console.log(`✅ Found ${events.length} games`);
          
          // Look for NYG vs WAS games
          for (const event of events) {
            const competitors = event.competitions?.[0]?.competitors || [];
            if (competitors.length >= 2) {
              const awayTeam = competitors.find(c => c.homeAway === 'away')?.team;
              const homeTeam = competitors.find(c => c.homeAway === 'home')?.team;
              
              if (awayTeam && homeTeam) {
                const awayName = awayTeam.name;
                const homeName = homeTeam.name;
                const awayAbbr = awayTeam.abbreviation;
                const homeAbbr = homeTeam.abbreviation;
                
                // Check if this matches our game
                const isMatch = (
                  (awayAbbr === 'NYG' && homeAbbr === 'WAS') ||
                  (awayAbbr === 'WAS' && homeAbbr === 'NYG') ||
                  awayName.includes('Giants') && homeName.includes('Commanders') ||
                  awayName.includes('Commanders') && homeName.includes('Giants')
                );
                
                if (isMatch) {
                  console.log(`🎯 FOUND MATCH!`);
                  console.log(`   Away: ${awayName} (${awayAbbr})`);
                  console.log(`   Home: ${homeName} (${homeAbbr})`);
                  console.log(`   Status: ${event.competitions[0].status.type.name}`);
                  console.log(`   Score: ${awayTeam.score} - ${homeTeam.score}`);
                  console.log(`   Date: ${event.competitions[0].date}`);
                } else {
                  console.log(`   ${awayName} (${awayAbbr}) @ ${homeName} (${homeAbbr})`);
                }
              }
            }
          }
          
        } catch (error) {
          console.log(`❌ Error fetching data: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testESPNAPI();


