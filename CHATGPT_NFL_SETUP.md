# ChatGPT NFL Data Service Setup

## Overview

The system now uses **ChatGPT as the primary method** to extract real NFL schedule data from NFL.com, with Puppeteer scraping as a fallback. **No mock data is used** - if both methods fail, the system shows an error message.

## Architecture

```
Primary: ChatGPT → NFL.com → Real Schedule Data
Fallback: Puppeteer → NFL.com → Real Schedule Data
Error: Show "Unable to load schedule data" message
```

## Setup Instructions

### 1. Get OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to "API Keys" section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### 2. Add Environment Variable

Add the OpenAI API key to your environment:

```bash
# Local development (.env.local)
OPENAI_API_KEY=sk-your-api-key-here

# Vercel deployment
# Add in Vercel dashboard under Environment Variables
```

### 3. Test the Service

```bash
# Test ChatGPT service
curl http://localhost:3001/api/test-chatgpt-nfl

# Test full update system
curl -X POST http://localhost:3001/api/test-update-matchups
```

## How It Works

### ChatGPT Method (Primary)
1. Sends a prompt to ChatGPT asking it to visit NFL.com
2. Requests extraction of current week's schedule
3. ChatGPT returns structured JSON data
4. System validates and processes the response

### Puppeteer Method (Fallback)
1. Uses headless browser to scrape NFL.com
2. Extracts game data using CSS selectors
3. Processes the HTML content
4. Returns structured data

### Error Handling
- If ChatGPT fails → tries Puppeteer
- If Puppeteer fails → shows error message
- **No mock data is ever used**

## API Endpoints

### `/api/test-chatgpt-nfl`
Tests the ChatGPT NFL service directly

**Success Response:**
```json
{
  "success": true,
  "current_week": "Preseason Week 2",
  "games_count": 8,
  "games": [...],
  "last_updated": "2025-08-13T22:00:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "OpenAI API key not configured",
  "current_week": "ERROR",
  "games_count": 0,
  "games": []
}
```

### `/api/test-update-matchups`
Tests the full update system with both methods

## Error Messages

### UI Error Messages
- **Current Week**: "⚠️ Unable to load schedule data"
- **Next Week**: "⚠️ Unable to load next week's schedule"

### Common Error Causes
1. **Missing API Key**: "OpenAI API key not configured"
2. **API Rate Limits**: "OpenAI API error: 429"
3. **Network Issues**: "Failed to fetch NFL schedule"
4. **Scraping Blocked**: "Failed to scrape NFL.com"

## Benefits

### ✅ Real Data Only
- No misleading mock data
- Always shows actual NFL schedule when available
- Clear error messages when data unavailable

### ✅ Reliable Fallback
- ChatGPT as primary method
- Puppeteer as backup
- Graceful degradation

### ✅ Transparent
- Clear error messages
- No hidden mock data
- Honest about data availability

## Cost Considerations

### OpenAI API Costs
- **GPT-4o**: ~$0.005 per 1K input tokens, ~$0.015 per 1K output tokens
- **Typical request**: ~500 tokens = ~$0.01 per schedule fetch
- **Daily cost**: ~$0.02 (2 fetches per day)

### Rate Limits
- OpenAI: 10,000 requests per minute
- NFL.com: No rate limits (public data)

## Troubleshooting

### ChatGPT Fails
1. Check API key is set correctly
2. Verify OpenAI account has credits
3. Check network connectivity
4. Review API rate limits

### Puppeteer Fails
1. NFL.com may be blocking automated access
2. Check if selectors have changed
3. Verify network connectivity
4. Review browser console logs

### Both Methods Fail
1. Check all environment variables
2. Verify network connectivity
3. Review server logs
4. Contact support if persistent

## Production Deployment

### Vercel Environment Variables
```
OPENAI_API_KEY=sk-your-api-key-here
WEATHERSTACK_API_KEY=your-weatherstack-key
CRON_SECRET_TOKEN=your-cron-token
```

### Monitoring
- Monitor API usage and costs
- Track success/failure rates
- Set up alerts for repeated failures
- Log all errors for debugging

The system is now **100% honest** about data availability and will never show misleading mock data! 🏈✨
