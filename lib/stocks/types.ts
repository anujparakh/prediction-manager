/**
 * TypeScript types for stock data integration
 */

/**
 * Current stock quote data from Twelve Data API
 */
export interface StockQuote {
  /** Stock symbol (e.g., AAPL) */
  symbol: string;
  /** Company name */
  name: string;
  /** Exchange where the stock is traded */
  exchange: string;
  /** Currency of the quote */
  currency: string;
  /** Current price */
  price: number;
  /** Opening price */
  open: number;
  /** Highest price of the day */
  high: number;
  /** Lowest price of the day */
  low: number;
  /** Previous closing price */
  previous_close: number;
  /** Trading volume */
  volume: number;
  /** Last update timestamp */
  timestamp: number;
  /** Price change from previous close */
  change: number;
  /** Percentage change from previous close */
  percent_change: number;
}

/**
 * Single day of historical stock data
 */
export interface HistoricalDataPoint {
  /** Date in YYYY-MM-DD format */
  datetime: string;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading volume */
  volume: number;
}

/**
 * Array of historical stock data points
 */
export interface HistoricalData {
  /** Stock symbol */
  symbol: string;
  /** Currency */
  currency: string;
  /** Exchange */
  exchange: string;
  /** Array of historical data points */
  values: HistoricalDataPoint[];
}

/**
 * Calculated technical indicator value
 */
export interface IndicatorValue {
  /** Indicator type (RSI, SMA, EMA, etc.) */
  type: string;
  /** Period used for calculation */
  period: number;
  /** Current indicator value */
  value: number | null;
  /** Array of historical indicator values */
  values?: Array<{
    datetime: string;
    value: number | null;
  }>;
}

/**
 * Request body for indicators API endpoint
 */
export interface IndicatorRequest {
  /** Stock symbol */
  symbol: string;
  /** Array of indicators to calculate */
  indicators: Array<{
    /** Indicator type (RSI, SMA, EMA, AVG_VOLUME) */
    type: 'RSI' | 'SMA' | 'EMA' | 'AVG_VOLUME';
    /** Period for calculation */
    period: number;
  }>;
  /** Optional: number of days of historical data to fetch */
  days?: number;
}

/**
 * Response from indicators API endpoint
 */
export interface IndicatorResponse {
  /** Stock symbol */
  symbol: string;
  /** Calculated indicators */
  indicators: IndicatorValue[];
}

/**
 * Twelve Data API error response
 */
export interface TwelveDataError {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** HTTP status */
  status: string;
}

/**
 * Rate limiting information
 */
export interface RateLimitInfo {
  /** Number of API calls remaining */
  remaining: number;
  /** Total API calls allowed per day */
  limit: number;
  /** Timestamp when the limit resets */
  reset: number;
}
