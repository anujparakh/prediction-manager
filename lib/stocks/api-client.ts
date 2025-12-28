/**
 * Twelve Data API client for stock data
 * Free tier: 800 API calls per day
 * API docs: https://twelvedata.com/docs
 */

import type {
  StockQuote,
  HistoricalData,
  HistoricalDataPoint,
  TwelveDataError,
} from './types';

const TWELVE_DATA_BASE_URL = 'https://api.twelvedata.com';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Rate limiting state (in-memory, resets on worker restart)
 */
let rateLimitState = {
  callsToday: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  dailyLimit: 800,
};

/**
 * Reset rate limit counter if it's a new day
 */
function checkAndResetRateLimit() {
  const today = new Date().toISOString().split('T')[0];
  if (today !== rateLimitState.lastResetDate) {
    rateLimitState.callsToday = 0;
    rateLimitState.lastResetDate = today;
  }
}

/**
 * Check if we've exceeded the rate limit
 */
function isRateLimitExceeded(): boolean {
  checkAndResetRateLimit();
  return rateLimitState.callsToday >= rateLimitState.dailyLimit;
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit() {
  checkAndResetRateLimit();
  rateLimitState.callsToday++;
}

/**
 * Get rate limit information
 */
export function getRateLimitInfo() {
  checkAndResetRateLimit();
  return {
    remaining: rateLimitState.dailyLimit - rateLimitState.callsToday,
    limit: rateLimitState.dailyLimit,
    callsToday: rateLimitState.callsToday,
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a request to Twelve Data API with retry logic
 */
async function makeApiRequest<T>(
  endpoint: string,
  params: Record<string, string>
): Promise<T> {
  // Check rate limit
  if (isRateLimitExceeded()) {
    throw new Error(
      `Rate limit exceeded. ${rateLimitState.callsToday}/${rateLimitState.dailyLimit} calls used today.`
    );
  }

  // Get API key from environment
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('TWELVE_DATA_API_KEY environment variable is not set');
  }

  // Build URL with query parameters
  const url = new URL(`${TWELVE_DATA_BASE_URL}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });
  url.searchParams.append('apikey', apiKey);

  let lastError: Error | null = null;

  // Retry logic
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(
        `[Twelve Data API] ${endpoint} (attempt ${attempt}/${MAX_RETRIES}):`,
        params
      );

      const response = await fetch(url.toString());
      incrementRateLimit();

      // Parse response
      const data = await response.json() as any;

      // Check for API errors
      if (!response.ok || data.status === 'error') {
        const error = data as TwelveDataError;
        throw new Error(
          `Twelve Data API error: ${error.message || 'Unknown error'} (${error.code || response.status})`
        );
      }

      // Check for rate limit in response
      if (data.code === 429 || data.message?.includes('rate limit')) {
        throw new Error('Rate limit exceeded by API');
      }

      console.log(
        `[Twelve Data API] Success. Rate limit: ${getRateLimitInfo().remaining}/${getRateLimitInfo().limit} remaining`
      );

      return data as T;
    } catch (error) {
      lastError =
        error instanceof Error ? error : new Error('Unknown error occurred');
      console.error(
        `[Twelve Data API] Attempt ${attempt}/${MAX_RETRIES} failed:`,
        lastError.message
      );

      // Don't retry on auth errors or invalid symbols
      if (
        lastError.message.includes('Invalid API key') ||
        lastError.message.includes('Symbol not found') ||
        lastError.message.includes('Invalid symbol')
      ) {
        throw lastError;
      }

      // Wait before retrying (exponential backoff)
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }
  }

  // All retries failed
  throw lastError || new Error('All API request attempts failed');
}

/**
 * Fetch current quote for a stock symbol
 * @param symbol Stock symbol (e.g., AAPL, MSFT)
 * @returns Current stock quote
 */
export async function fetchQuote(symbol: string): Promise<StockQuote> {
  const response = await makeApiRequest<any>('/quote', {
    symbol: symbol.toUpperCase(),
  });

  // Transform Twelve Data response to our format
  return {
    symbol: response.symbol,
    name: response.name,
    exchange: response.exchange,
    currency: response.currency || 'USD',
    price: parseFloat(response.close),
    open: parseFloat(response.open),
    high: parseFloat(response.high),
    low: parseFloat(response.low),
    previous_close: parseFloat(response.previous_close),
    volume: parseInt(response.volume, 10),
    timestamp: response.timestamp || Date.now() / 1000,
    change: parseFloat(response.change || '0'),
    percent_change: parseFloat(response.percent_change || '0'),
  };
}

/**
 * Fetch historical daily data for a stock symbol
 * @param symbol Stock symbol (e.g., AAPL, MSFT)
 * @param from Start date in YYYY-MM-DD format (optional)
 * @param to End date in YYYY-MM-DD format (optional)
 * @param limit Number of data points to return (default: 100, max: 5000)
 * @returns Historical stock data
 */
export async function fetchHistoricalData(
  symbol: string,
  options: {
    from?: string;
    to?: string;
    limit?: number;
  } = {}
): Promise<HistoricalData> {
  const { from, to, limit = 100 } = options;

  const params: Record<string, string> = {
    symbol: symbol.toUpperCase(),
    interval: '1day',
    outputsize: Math.min(limit, 5000).toString(),
  };

  // Add date range if provided
  if (from) {
    params.start_date = from;
  }
  if (to) {
    params.end_date = to;
  }

  const response = await makeApiRequest<any>('/time_series', params);

  // Transform Twelve Data response to our format
  const values: HistoricalDataPoint[] = (response.values || []).map(
    (point: any) => ({
      datetime: point.datetime,
      open: parseFloat(point.open),
      high: parseFloat(point.high),
      low: parseFloat(point.low),
      close: parseFloat(point.close),
      volume: parseInt(point.volume, 10),
    })
  );

  return {
    symbol: response.meta?.symbol || symbol.toUpperCase(),
    currency: response.meta?.currency || 'USD',
    exchange: response.meta?.exchange || '',
    values,
  };
}

/**
 * Validate a stock symbol (checks if it exists)
 * @param symbol Stock symbol to validate
 * @returns True if symbol is valid
 */
export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    await fetchQuote(symbol);
    return true;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred';
    if (
      message.includes('Symbol not found') ||
      message.includes('Invalid symbol')
    ) {
      return false;
    }
    // Re-throw other errors (network issues, etc.)
    throw error;
  }
}
