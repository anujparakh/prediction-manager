# Stock Data Integration Examples

This document provides practical examples for using the stock data integration layer.

## Table of Contents

1. [API Endpoint Examples](#api-endpoint-examples)
2. [Server-Side Usage Examples](#server-side-usage-examples)
3. [Client-Side Integration Examples](#client-side-integration-examples)
4. [Error Handling Examples](#error-handling-examples)

## API Endpoint Examples

### Example 1: Fetch Stock Quote

```bash
# Using curl
curl "http://localhost:3000/api/stocks/quote?symbol=AAPL"

# Using fetch in JavaScript
const response = await fetch('/api/stocks/quote?symbol=AAPL');
const data = await response.json();
console.log(`Current price: $${data.data.price}`);
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

### Example 2: Fetch Historical Data (Last 30 Days)

```bash
curl "http://localhost:3000/api/stocks/historical?symbol=AAPL&limit=30"
```

```typescript
// TypeScript/JavaScript
const fetchHistoricalData = async (symbol: string, days: number = 30) => {
  const response = await fetch(
    `/api/stocks/historical?symbol=${symbol}&limit=${days}`
  );
  const data = await response.json();
  return data.data.values;
};

const history = await fetchHistoricalData('AAPL', 30);
console.log(`Fetched ${history.length} days of data`);
```

### Example 3: Fetch Historical Data with Date Range

```bash
curl "http://localhost:3000/api/stocks/historical?symbol=AAPL&from=2024-01-01&to=2024-12-31"
```

```typescript
const fetchDateRange = async (
  symbol: string,
  from: string,
  to: string
) => {
  const params = new URLSearchParams({ symbol, from, to });
  const response = await fetch(`/api/stocks/historical?${params}`);
  return await response.json();
};

const ytdData = await fetchDateRange('AAPL', '2024-01-01', '2024-12-31');
```

### Example 4: Calculate Technical Indicators

```bash
curl -X POST "http://localhost:3000/api/stocks/indicators" \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "indicators": [
      { "type": "RSI", "period": 14 },
      { "type": "SMA", "period": 50 },
      { "type": "EMA", "period": 20 }
    ]
  }'
```

```typescript
const calculateIndicators = async (symbol: string) => {
  const response = await fetch('/api/stocks/indicators', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol,
      indicators: [
        { type: 'RSI', period: 14 },
        { type: 'SMA', period: 50 },
        { type: 'EMA', period: 20 },
        { type: 'AVG_VOLUME', period: 20 },
      ],
    }),
  });

  const data = await response.json();
  return data.data.indicators;
};

const indicators = await calculateIndicators('AAPL');
indicators.forEach(ind => {
  console.log(`${ind.type}(${ind.period}): ${ind.value}`);
});
```

## Server-Side Usage Examples

### Example 5: Server-Side Stock Analysis

```typescript
// app/actions/analyze-stock.ts
'use server';

import { fetchQuote, fetchHistoricalData } from '@/lib/stocks/api-client';
import { calculateRSI, calculateSMA } from '@/lib/stocks/indicators';

export async function analyzeStock(symbol: string) {
  // Fetch current quote
  const quote = await fetchQuote(symbol);

  // Fetch historical data (100 days for indicators)
  const historical = await fetchHistoricalData(symbol, { limit: 100 });

  // Calculate indicators
  const rsi14 = calculateRSI(historical, 14);
  const sma50 = calculateSMA(historical, 50);
  const sma200 = calculateSMA(historical, 200);

  // Determine signal
  let signal = 'HOLD';
  if (rsi14 !== null && rsi14 < 30) signal = 'BUY';
  if (rsi14 !== null && rsi14 > 70) signal = 'SELL';

  return {
    symbol: quote.symbol,
    price: quote.price,
    change: quote.percent_change,
    rsi: rsi14,
    sma50,
    sma200,
    signal,
  };
}
```

### Example 6: Batch Stock Fetching

```typescript
// Server-side: Fetch multiple stocks
import { fetchQuote } from '@/lib/stocks/api-client';

async function fetchPortfolio(symbols: string[]) {
  const quotes = await Promise.all(
    symbols.map(symbol => fetchQuote(symbol).catch(err => {
      console.error(`Failed to fetch ${symbol}:`, err.message);
      return null;
    }))
  );

  return quotes.filter(q => q !== null);
}

const portfolio = await fetchPortfolio(['AAPL', 'MSFT', 'GOOGL', 'AMZN']);
console.log(`Fetched ${portfolio.length} stocks`);
```

### Example 7: Moving Average Crossover Strategy

```typescript
import { fetchHistoricalData } from '@/lib/stocks/api-client';
import { calculateSMA } from '@/lib/stocks/indicators';

async function checkMovingAverageCrossover(symbol: string) {
  // Need at least 200 days for SMA(200)
  const historical = await fetchHistoricalData(symbol, { limit: 250 });

  const sma50 = calculateSMA(historical, 50);
  const sma200 = calculateSMA(historical, 200);

  if (sma50 === null || sma200 === null) {
    return { signal: 'UNKNOWN', reason: 'Insufficient data' };
  }

  // Golden Cross: SMA(50) crosses above SMA(200) - bullish
  // Death Cross: SMA(50) crosses below SMA(200) - bearish
  if (sma50 > sma200) {
    return { signal: 'BULLISH', sma50, sma200 };
  } else if (sma50 < sma200) {
    return { signal: 'BEARISH', sma50, sma200 };
  }

  return { signal: 'NEUTRAL', sma50, sma200 };
}

const signal = await checkMovingAverageCrossover('AAPL');
console.log(`Signal: ${signal.signal}`);
```

### Example 8: Volume Analysis

```typescript
import { fetchQuote, fetchHistoricalData } from '@/lib/stocks/api-client';
import { calculateAverageVolume } from '@/lib/stocks/indicators';

async function analyzeVolume(symbol: string) {
  const [quote, historical] = await Promise.all([
    fetchQuote(symbol),
    fetchHistoricalData(symbol, { limit: 50 })
  ]);

  const avgVolume20 = calculateAverageVolume(historical, 20);

  if (avgVolume20 === null) {
    return { signal: 'UNKNOWN' };
  }

  const volumeRatio = quote.volume / avgVolume20;

  return {
    currentVolume: quote.volume,
    averageVolume: avgVolume20,
    ratio: volumeRatio,
    signal: volumeRatio > 1.5 ? 'HIGH_VOLUME' : 'NORMAL_VOLUME'
  };
}

const volumeAnalysis = await analyzeVolume('AAPL');
console.log(`Volume is ${volumeAnalysis.ratio.toFixed(2)}x average`);
```

## Client-Side Integration Examples

### Example 9: React Component with Stock Quote

```typescript
// components/StockQuote.tsx
'use client';

import { useState, useEffect } from 'react';

interface StockQuoteProps {
  symbol: string;
}

export function StockQuote({ symbol }: StockQuoteProps) {
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchQuote() {
      try {
        setLoading(true);
        const response = await fetch(`/api/stocks/quote?symbol=${symbol}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch quote');
        }

        setQuote(data.data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchQuote();
    // Refresh every 60 seconds
    const interval = setInterval(fetchQuote, 60000);
    return () => clearInterval(interval);
  }, [symbol]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!quote) return null;

  return (
    <div className="stock-quote">
      <h2>{quote.symbol}</h2>
      <p className="price">${quote.price.toFixed(2)}</p>
      <p className={quote.change >= 0 ? 'positive' : 'negative'}>
        {quote.change >= 0 ? '+' : ''}{quote.percent_change.toFixed(2)}%
      </p>
    </div>
  );
}
```

### Example 10: React Component with Technical Indicators

```typescript
// components/StockIndicators.tsx
'use client';

import { useState, useEffect } from 'react';

export function StockIndicators({ symbol }: { symbol: string }) {
  const [indicators, setIndicators] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchIndicators() {
      setLoading(true);
      try {
        const response = await fetch('/api/stocks/indicators', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            indicators: [
              { type: 'RSI', period: 14 },
              { type: 'SMA', period: 50 },
              { type: 'SMA', period: 200 },
            ],
          }),
        });

        const data = await response.json();
        setIndicators(data.data.indicators);
      } catch (err) {
        console.error('Failed to fetch indicators:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchIndicators();
  }, [symbol]);

  if (loading) return <div>Loading indicators...</div>;

  return (
    <div className="indicators">
      <h3>Technical Indicators</h3>
      {indicators.map((ind) => (
        <div key={`${ind.type}-${ind.period}`}>
          <span>{ind.type}({ind.period}): </span>
          <strong>{ind.value?.toFixed(2) || 'N/A'}</strong>
        </div>
      ))}
    </div>
  );
}
```

## Error Handling Examples

### Example 11: Comprehensive Error Handling

```typescript
async function safeStockFetch(symbol: string) {
  try {
    const response = await fetch(`/api/stocks/quote?symbol=${symbol}`);
    const data = await response.json();

    // Handle different error types
    if (response.status === 404) {
      return { error: 'Symbol not found. Please check the symbol.' };
    }

    if (response.status === 429) {
      return { error: 'Rate limit exceeded. Please try again later.' };
    }

    if (!response.ok) {
      return { error: data.message || 'Failed to fetch stock data' };
    }

    return { data: data.data };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Network error occurred'
    };
  }
}

const result = await safeStockFetch('INVALID');
if (result.error) {
  console.error(result.error);
} else {
  console.log(result.data);
}
```

### Example 12: Rate Limit Monitoring

```typescript
// Server-side: Monitor rate limits
import { getRateLimitInfo } from '@/lib/stocks/api-client';

export async function checkRateLimit() {
  const rateLimitInfo = getRateLimitInfo();

  if (rateLimitInfo.remaining < 50) {
    console.warn(
      `⚠️ Low on API calls: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining`
    );
  }

  return rateLimitInfo;
}

// Use before making API calls
const rateLimitInfo = await checkRateLimit();
if (rateLimitInfo.remaining > 0) {
  const quote = await fetchQuote('AAPL');
}
```

### Example 13: Retry with Exponential Backoff (Client-Side)

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on client errors (4xx) except 429
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      if (response.ok) {
        return response;
      }

      // Retry on 5xx or 429
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (err) {
      if (attempt === maxRetries) throw err;

      // Wait before retrying
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
const response = await fetchWithRetry('/api/stocks/quote?symbol=AAPL');
const data = await response.json();
```

## Testing Examples

### Example 14: Test Data Fetching

```typescript
// Test different symbols
const testSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];

for (const symbol of testSymbols) {
  try {
    const quote = await fetchQuote(symbol);
    console.log(`✓ ${symbol}: $${quote.price}`);
  } catch (err) {
    console.error(`✗ ${symbol}:`, err.message);
  }

  // Add delay to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 1000));
}
```

### Example 15: Integration Test

```typescript
// Complete integration test
async function integrationTest() {
  console.log('Running stock integration tests...');

  // Test 1: Fetch quote
  console.log('\n1. Testing quote fetch...');
  const quote = await fetchQuote('AAPL');
  console.log(`✓ Quote fetched: $${quote.price}`);

  // Test 2: Fetch historical data
  console.log('\n2. Testing historical data fetch...');
  const historical = await fetchHistoricalData('AAPL', { limit: 100 });
  console.log(`✓ Historical data fetched: ${historical.values.length} days`);

  // Test 3: Calculate RSI
  console.log('\n3. Testing RSI calculation...');
  const rsi = calculateRSI(historical, 14);
  console.log(`✓ RSI(14): ${rsi?.toFixed(2)}`);

  // Test 4: Calculate SMA
  console.log('\n4. Testing SMA calculation...');
  const sma = calculateSMA(historical, 50);
  console.log(`✓ SMA(50): $${sma?.toFixed(2)}`);

  // Test 5: Rate limit check
  console.log('\n5. Testing rate limit tracking...');
  const rateLimitInfo = getRateLimitInfo();
  console.log(`✓ Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);

  console.log('\n✅ All tests passed!');
}

await integrationTest();
```

## Best Practices

1. **Rate Limit Management**: Always monitor your API usage to stay within the free tier limit (800 calls/day)
2. **Error Handling**: Always handle errors gracefully and provide user-friendly error messages
3. **Caching**: The API routes include cache headers, but consider additional client-side caching for frequently accessed data
4. **Data Validation**: Always validate stock symbols before making API calls
5. **Indicator Periods**: Ensure you fetch enough historical data for your indicator periods (e.g., 200+ days for SMA(200))
