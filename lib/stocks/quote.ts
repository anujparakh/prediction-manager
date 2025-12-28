/**
 * Helper functions for fetching stock quotes
 */

import { fetchQuote } from './api-client';
import type { StockQuote } from './types';

/**
 * Get current stock quote
 * @param symbol Stock symbol
 * @returns Stock quote with price information
 * @throws Error if quote cannot be fetched
 */
export async function getStockQuote(symbol: string): Promise<StockQuote> {
  try {
    const quote = await fetchQuote(symbol);
    return quote;
  } catch (error) {
    console.error(`[Quote] Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}

/**
 * Get current price for a stock
 * @param symbol Stock symbol
 * @returns Current price
 * @throws Error if price cannot be fetched
 */
export async function getStockPrice(symbol: string): Promise<number> {
  const quote = await getStockQuote(symbol);
  return quote.price;
}

/**
 * Get current prices for multiple stocks
 * @param symbols Array of stock symbols
 * @returns Map of symbol to price
 */
export async function getMultipleStockPrices(
  symbols: string[]
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  // Fetch quotes in parallel
  const results = await Promise.allSettled(
    symbols.map(async symbol => {
      const quote = await getStockQuote(symbol);
      return { symbol, price: quote.price };
    })
  );

  // Process results
  for (const result of results) {
    if (result.status === 'fulfilled') {
      prices.set(result.value.symbol, result.value.price);
    }
  }

  return prices;
}
