# Stock Data Integration Layer

This module provides integration with the Twelve Data API for real-time stock quotes, historical data, and technical indicator calculations.

## Overview

The stock integration layer consists of:

1. **API Client** (`api-client.ts`) - Handles communication with Twelve Data API
2. **Technical Indicators** (`indicators.ts`) - Calculates technical indicators using the `technicalindicators` package
3. **Type Definitions** (`types.ts`) - TypeScript types for stock data
4. **API Routes** - Next.js API endpoints for client-side access

## Setup

### 1. Get a Twelve Data API Key

1. Sign up at [https://twelvedata.com/](https://twelvedata.com/)
2. Get your free API key (800 calls/day)
3. Add to your `.env` file:

```env
TWELVE_DATA_API_KEY=your_api_key_here
```

### 2. Install Dependencies

The `technicalindicators` package is already included in `package.json`:

```bash
npm install
```

## API Endpoints

### GET /api/stocks/quote

Fetch current quote for a stock symbol.

**Query Parameters:**
- `symbol` (required): Stock symbol (e.g., AAPL, MSFT, GOOGL)

**Example:**
```bash
curl "http://localhost:3000/api/stocks/quote?symbol=AAPL"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "name": "Apple Inc",
    "exchange": "NASDAQ",
    "currency": "USD",
    "price": 195.50,
    "open": 194.00,
    "high": 196.20,
    "low": 193.80,
    "previous_close": 194.30,
    "volume": 52000000,
    "timestamp": 1703260800,
    "change": 1.20,
    "percent_change": 0.62
  }
}
```

### GET /api/stocks/historical

Fetch historical daily data for a stock symbol.

**Query Parameters:**
- `symbol` (required): Stock symbol
- `from` (optional): Start date in YYYY-MM-DD format
- `to` (optional): End date in YYYY-MM-DD format
- `limit` (optional): Number of data points (default: 100, max: 5000)

**Example:**
```bash
curl "http://localhost:3000/api/stocks/historical?symbol=AAPL&limit=30"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "currency": "USD",
    "exchange": "NASDAQ",
    "values": [
      {
        "datetime": "2024-12-26",
        "open": 194.00,
        "high": 196.20,
        "low": 193.80,
        "close": 195.50,
        "volume": 52000000
      }
      // ... more data points
    ]
  },
  "meta": {
    "count": 30,
    "from": null,
    "to": null,
    "limit": 30
  }
}
```

### POST /api/stocks/indicators

Calculate technical indicators for a stock symbol.

**Request Body:**
```json
{
  "symbol": "AAPL",
  "indicators": [
    { "type": "RSI", "period": 14 },
    { "type": "SMA", "period": 50 },
    { "type": "EMA", "period": 20 },
    { "type": "AVG_VOLUME", "period": 20 }
  ],
  "days": 100
}
```

**Supported Indicator Types:**
- `RSI` - Relative Strength Index
- `SMA` - Simple Moving Average
- `EMA` - Exponential Moving Average
- `AVG_VOLUME` - Average Volume

**Example:**
```bash
curl -X POST "http://localhost:3000/api/stocks/indicators" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "indicators": [
      { "type": "RSI", "period": 14 },
      { "type": "SMA", "period": 50 }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "indicators": [
      {
        "type": "RSI",
        "period": 14,
        "value": 65.32
      },
      {
        "type": "SMA",
        "period": 50,
        "value": 192.45
      }
    ]
  },
  "meta": {
    "dataPoints": 100
  }
}
```

## Using the API Client Directly

You can also use the API client functions directly in server-side code:

```typescript
import { fetchQuote, fetchHistoricalData } from '@/lib/stocks/api-client';
import { calculateRSI, calculateSMA } from '@/lib/stocks/indicators';

// Fetch current quote
const quote = await fetchQuote('AAPL');
console.log(`Current price: $${quote.price}`);

// Fetch historical data
const historical = await fetchHistoricalData('AAPL', { limit: 100 });

// Calculate RSI
const rsi = calculateRSI(historical, 14);
console.log(`RSI(14): ${rsi}`);

// Calculate SMA
const sma = calculateSMA(historical, 50);
console.log(`SMA(50): $${sma}`);
```

## Rate Limiting

The free tier of Twelve Data API allows **800 calls per day**. The API client includes:

- Automatic rate limit tracking
- Error handling when limit is exceeded
- Retry logic for failed requests (3 attempts with exponential backoff)

Check rate limit status:

```typescript
import { getRateLimitInfo } from '@/lib/stocks/api-client';

const rateLimitInfo = getRateLimitInfo();
console.log(`${rateLimitInfo.remaining}/${rateLimitInfo.limit} calls remaining`);
```

## Technical Indicators

### RSI (Relative Strength Index)

Measures momentum, typically used to identify overbought (>70) or oversold (<30) conditions.

```typescript
import { calculateRSI } from '@/lib/stocks/indicators';

// Calculate current RSI
const rsi = calculateRSI(historicalData, 14); // 14-day RSI

// Get RSI history
const rsiHistory = calculateRSIHistory(historicalData, 14);
```

### SMA (Simple Moving Average)

Average price over a specific period, used to identify trends.

```typescript
import { calculateSMA } from '@/lib/stocks/indicators';

// Calculate current SMA
const sma50 = calculateSMA(historicalData, 50); // 50-day SMA
const sma200 = calculateSMA(historicalData, 200); // 200-day SMA

// Get SMA history
const smaHistory = calculateSMAHistory(historicalData, 50);
```

### EMA (Exponential Moving Average)

Weighted average that gives more importance to recent prices.

```typescript
import { calculateEMA } from '@/lib/stocks/indicators';

// Calculate current EMA
const ema20 = calculateEMA(historicalData, 20); // 20-day EMA

// Get EMA history
const emaHistory = calculateEMAHistory(historicalData, 20);
```

### Average Volume

Average trading volume over a period.

```typescript
import { calculateAverageVolume } from '@/lib/stocks/indicators';

// Calculate average volume
const avgVol = calculateAverageVolume(historicalData, 20); // 20-day average

// Get average volume history
const avgVolHistory = calculateAverageVolumeHistory(historicalData, 20);
```

## Error Handling

All API endpoints and functions include comprehensive error handling:

- **400 Bad Request** - Invalid parameters or request format
- **404 Not Found** - Symbol not found or no data available
- **429 Too Many Requests** - Rate limit exceeded
- **500 Internal Server Error** - API configuration or server errors

Example error response:

```json
{
  "error": "Symbol not found",
  "message": "The requested stock symbol was not found.",
  "details": "Twelve Data API error: Symbol not found (404)"
}
```

## Edge Runtime Compatibility

All API routes use the Edge Runtime and are compatible with Cloudflare Workers:

```typescript
export const runtime = 'edge';
```

This means:
- No Node.js APIs are used
- Runs on Cloudflare's edge network
- Fast cold starts
- Global distribution

## Caching

API responses include appropriate cache headers:

- **Quote endpoint**: 60 seconds cache, 120 seconds stale-while-revalidate
- **Historical endpoint**: 5 minutes cache, 10 minutes stale-while-revalidate
- **Indicators endpoint**: 5 minutes cache, 10 minutes stale-while-revalidate

## Development and Testing

### Testing Endpoints Locally

```bash
# Start the dev server
npm run dev

# Test quote endpoint
curl "http://localhost:3000/api/stocks/quote?symbol=AAPL"

# Test historical endpoint
curl "http://localhost:3000/api/stocks/historical?symbol=AAPL&limit=30"

# Test indicators endpoint
curl -X POST "http://localhost:3000/api/stocks/indicators" \
  -H "Content-Type: application/json" \
  -d '{"symbol":"AAPL","indicators":[{"type":"RSI","period":14}]}'
```

### Example Symbols to Test

- `AAPL` - Apple Inc.
- `MSFT` - Microsoft Corporation
- `GOOGL` - Alphabet Inc. Class A
- `AMZN` - Amazon.com Inc.
- `TSLA` - Tesla Inc.
- `META` - Meta Platforms Inc.
- `NVDA` - NVIDIA Corporation
- `SPY` - S&P 500 ETF

## Limitations

### Free Tier Constraints

- 800 API calls per day
- 8 API calls per minute
- End-of-day data only (no intraday for free tier)
- Limited to major exchanges

### Data Availability

- Historical data may be limited for some symbols
- Some indicators require minimum data points (e.g., RSI needs period + 1)
- Weekend and holiday data may be delayed

## Troubleshooting

### "Rate limit exceeded" Error

The free tier allows 800 calls/day. Monitor your usage with `getRateLimitInfo()`.

### "Symbol not found" Error

Ensure you're using valid stock symbols. Test with known symbols like AAPL or MSFT first.

### "Insufficient data" Error

Some indicators require more historical data than available. Increase the `days` parameter or use a shorter period.

### "API key not set" Error

Make sure `TWELVE_DATA_API_KEY` is set in your `.env` file and the server has been restarted.

## Resources

- [Twelve Data API Documentation](https://twelvedata.com/docs)
- [Technical Indicators Package](https://github.com/anandanand84/technicalindicators)
- [Stock Symbol Search](https://www.twelvedata.com/stocks)
