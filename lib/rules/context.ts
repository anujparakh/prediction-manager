/**
 * Stock function context for rule evaluation
 * Creates a context object with all available stock data and functions
 * that can be used in rule expressions
 */

import type { HistoricalData, HistoricalDataPoint } from '../stocks/types';
import {
  calculateRSI,
  calculateSMA,
  calculateEMA,
  calculateAverageVolume,
} from '../stocks/indicators';

/**
 * Context object that provides all available functions and properties
 * for evaluating rule expressions
 */
export interface StockContext {
  // Current stock properties (from most recent data point)
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  price: number; // Alias for close

  // Technical indicator functions
  RSI: (period: number) => number | null;
  SMA: (period: number) => number | null;
  EMA: (period: number) => number | null;
  avgVolume: (period: number) => number | null;

  // Metadata
  symbol: string;
  datetime: string;
}

/**
 * Error thrown when creating stock context fails
 */
export class StockContextError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'StockContextError';
  }
}

/**
 * Get the most recent data point from historical data
 *
 * @param historicalData - Historical stock data
 * @returns Most recent data point
 * @throws StockContextError if no data available
 */
function getMostRecentDataPoint(
  historicalData: HistoricalData
): HistoricalDataPoint {
  if (!historicalData.values || historicalData.values.length === 0) {
    throw new StockContextError(
      'No historical data available',
      'Historical data is empty or undefined'
    );
  }

  // Twelve Data returns most recent first
  return historicalData.values[0];
}

/**
 * Create a stock context from historical data
 * This context is used to evaluate rule expressions
 *
 * @param historicalData - Historical stock data
 * @returns Context object with all available functions and properties
 * @throws StockContextError if context creation fails
 *
 * @example
 * ```typescript
 * const context = createStockContext(historicalData);
 * const rsi = context.RSI(14);
 * const sma = context.SMA(50);
 * const currentPrice = context.close;
 *
 * // Use in expression evaluation
 * if (rsi < 30 && currentPrice > sma) {
 *   console.log('Buy signal!');
 * }
 * ```
 */
export function createStockContext(
  historicalData: HistoricalData
): StockContext {
  try {
    // Get the most recent data point
    const current = getMostRecentDataPoint(historicalData);

    // Validate data point has required fields
    if (
      typeof current.close !== 'number' ||
      typeof current.open !== 'number' ||
      typeof current.high !== 'number' ||
      typeof current.low !== 'number' ||
      typeof current.volume !== 'number'
    ) {
      throw new StockContextError(
        'Invalid data point',
        'Data point is missing required numeric fields'
      );
    }

    // Create context object
    const context: StockContext = {
      // Current values
      close: current.close,
      open: current.open,
      high: current.high,
      low: current.low,
      volume: current.volume,
      price: current.close, // Alias for close

      // Technical indicators
      RSI: (period: number) => {
        if (!Number.isInteger(period) || period <= 0) {
          console.warn(`Invalid RSI period: ${period}`);
          return null;
        }
        return calculateRSI(historicalData, period);
      },

      SMA: (period: number) => {
        if (!Number.isInteger(period) || period <= 0) {
          console.warn(`Invalid SMA period: ${period}`);
          return null;
        }
        return calculateSMA(historicalData, period);
      },

      EMA: (period: number) => {
        if (!Number.isInteger(period) || period <= 0) {
          console.warn(`Invalid EMA period: ${period}`);
          return null;
        }
        return calculateEMA(historicalData, period);
      },

      avgVolume: (period: number) => {
        if (!Number.isInteger(period) || period <= 0) {
          console.warn(`Invalid avgVolume period: ${period}`);
          return null;
        }
        return calculateAverageVolume(historicalData, period);
      },

      // Metadata
      symbol: historicalData.symbol,
      datetime: current.datetime,
    };

    return context;
  } catch (error) {
    if (error instanceof StockContextError) {
      throw error;
    }
    throw new StockContextError(
      'Failed to create stock context',
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Validate that a context has all required properties and functions
 * Useful for testing and debugging
 *
 * @param context - Stock context to validate
 * @returns True if context is valid
 */
export function validateStockContext(context: StockContext): boolean {
  // Check all required properties exist and are numbers
  const requiredProps = ['close', 'open', 'high', 'low', 'volume', 'price'];
  for (const prop of requiredProps) {
    if (typeof (context as any)[prop] !== 'number') {
      console.error(`Missing or invalid property: ${prop}`);
      return false;
    }
  }

  // Check all required functions exist and are functions
  const requiredFuncs = ['RSI', 'SMA', 'EMA', 'avgVolume'];
  for (const func of requiredFuncs) {
    if (typeof (context as any)[func] !== 'function') {
      console.error(`Missing or invalid function: ${func}`);
      return false;
    }
  }

  // Check metadata
  if (typeof context.symbol !== 'string' || !context.symbol) {
    console.error('Missing or invalid symbol');
    return false;
  }

  if (typeof context.datetime !== 'string' || !context.datetime) {
    console.error('Missing or invalid datetime');
    return false;
  }

  return true;
}

/**
 * Get a summary of the current context values
 * Useful for debugging and logging
 *
 * @param context - Stock context
 * @returns Object with current values and metadata
 */
export function getContextSummary(context: StockContext): {
  symbol: string;
  datetime: string;
  price: number;
  volume: number;
  open: number;
  high: number;
  low: number;
} {
  return {
    symbol: context.symbol,
    datetime: context.datetime,
    price: context.price,
    volume: context.volume,
    open: context.open,
    high: context.high,
    low: context.low,
  };
}
