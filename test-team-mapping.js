// Test the team name mapping
const { ESPNService } = require('./src/lib/espn-service.ts');

const espnService = new ESPNService();

// Test the mapping function
console.log('Testing team name mapping:');
console.log('WSH ->', espnService.mapTeamName('WSH')); // Should return 'WAS'
console.log('NYG ->', espnService.mapTeamName('NYG')); // Should return 'NYG'
console.log('LAR ->', espnService.mapTeamName('LAR')); // Should return 'LAR'

// Test a sample ESPN game conversion
const sampleESPNGame = {
  id: 'test-game',
  competitions: [{
    competitors: [
      {
        homeAway: 'away',
        team: { abbreviation: 'WSH' },
        score: '21'
      },
      {
        homeAway: 'home', 
        team: { abbreviation: 'NYG' },
        score: '28'
      }
    ],
    status: {
      type: { state: 'post' },
      period: 4
    },
    date: '2025-09-07T13:00:00Z',
    venue: { fullName: 'MetLife Stadium' }
  }]
};

const converted = espnService.convertToMatchupFormat(sampleESPNGame);
console.log('\nConverted game:');
console.log('Away team:', converted.away_team); // Should be 'WAS'
console.log('Home team:', converted.home_team); // Should be 'NYG'
console.log('Status:', converted.status);
console.log('Winner:', converted.winner);


