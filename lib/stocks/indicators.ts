/**
 * Technical indicators calculation using technicalindicators package
 * Docs: https://github.com/anandanand84/technicalindicators
 */

import { RSI, SMA, EMA } from 'technicalindicators';
import type { HistoricalData, HistoricalDataPoint } from './types';

/**
 * Convert historical data to array of closing prices
 * @param historicalData Historical stock data
 * @returns Array of closing prices (most recent last)
 */
function getClosingPrices(historicalData: HistoricalData): number[] {
  // Twelve Data returns most recent first, but indicators need oldest first
  return [...historicalData.values]
    .reverse()
    .map((point) => point.close)
    .filter((price) => !isNaN(price));
}

/**
 * Convert historical data to array of volumes
 * @param historicalData Historical stock data
 * @returns Array of volumes (most recent last)
 */
function getVolumes(historicalData: HistoricalData): number[] {
  // Twelve Data returns most recent first, but indicators need oldest first
  return [...historicalData.values]
    .reverse()
    .map((point) => point.volume)
    .filter((volume) => !isNaN(volume));
}

/**
 * Calculate RSI (Relative Strength Index)
 * @param historicalData Historical stock data
 * @param period Period for RSI calculation (default: 14)
 * @returns Current RSI value or null if insufficient data
 */
export function calculateRSI(
  historicalData: HistoricalData,
  period: number = 14
): number | null {
  const closingPrices = getClosingPrices(historicalData);

  // Need at least period + 1 data points for RSI
  if (closingPrices.length < period + 1) {
    console.warn(
      `Insufficient data for RSI calculation. Need ${period + 1} points, got ${closingPrices.length}`
    );
    return null;
  }

  try {
    const rsiValues = RSI.calculate({
      values: closingPrices,
      period,
    });

    // Return the most recent RSI value
    return rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : null;
  } catch (error) {
    console.error('Error calculating RSI:', error);
    return null;
  }
}

/**
 * Calculate all RSI values for historical data
 * @param historicalData Historical stock data
 * @param period Period for RSI calculation (default: 14)
 * @returns Array of RSI values with dates
 */
export function calculateRSIHistory(
  historicalData: HistoricalData,
  period: number = 14
): Array<{ datetime: string; value: number | null }> {
  const closingPrices = getClosingPrices(historicalData);
  const dates = [...historicalData.values].reverse();

  if (closingPrices.length < period + 1) {
    return [];
  }

  try {
    const rsiValues = RSI.calculate({
      values: closingPrices,
      period,
    });

    // RSI starts after period warmup, so align dates
    const startIndex = closingPrices.length - rsiValues.length;
    return rsiValues.map((value, index) => ({
      datetime: dates[startIndex + index].datetime,
      value: value || null,
    }));
  } catch (error) {
    console.error('Error calculating RSI history:', error);
    return [];
  }
}

/**
 * Calculate SMA (Simple Moving Average)
 * @param historicalData Historical stock data
 * @param period Period for SMA calculation (default: 50)
 * @returns Current SMA value or null if insufficient data
 */
export function calculateSMA(
  historicalData: HistoricalData,
  period: number = 50
): number | null {
  const closingPrices = getClosingPrices(historicalData);

  // Need at least period data points for SMA
  if (closingPrices.length < period) {
    console.warn(
      `Insufficient data for SMA calculation. Need ${period} points, got ${closingPrices.length}`
    );
    return null;
  }

  try {
    const smaValues = SMA.calculate({
      values: closingPrices,
      period,
    });

    // Return the most recent SMA value
    return smaValues.length > 0 ? smaValues[smaValues.length - 1] : null;
  } catch (error) {
    console.error('Error calculating SMA:', error);
    return null;
  }
}

/**
 * Calculate all SMA values for historical data
 * @param historicalData Historical stock data
 * @param period Period for SMA calculation (default: 50)
 * @returns Array of SMA values with dates
 */
export function calculateSMAHistory(
  historicalData: HistoricalData,
  period: number = 50
): Array<{ datetime: string; value: number | null }> {
  const closingPrices = getClosingPrices(historicalData);
  const dates = [...historicalData.values].reverse();

  if (closingPrices.length < period) {
    return [];
  }

  try {
    const smaValues = SMA.calculate({
      values: closingPrices,
      period,
    });

    // SMA starts after period warmup, so align dates
    const startIndex = period - 1;
    return smaValues.map((value, index) => ({
      datetime: dates[startIndex + index].datetime,
      value: value || null,
    }));
  } catch (error) {
    console.error('Error calculating SMA history:', error);
    return [];
  }
}

/**
 * Calculate EMA (Exponential Moving Average)
 * @param historicalData Historical stock data
 * @param period Period for EMA calculation (default: 20)
 * @returns Current EMA value or null if insufficient data
 */
export function calculateEMA(
  historicalData: HistoricalData,
  period: number = 20
): number | null {
  const closingPrices = getClosingPrices(historicalData);

  // Need at least period data points for EMA
  if (closingPrices.length < period) {
    console.warn(
      `Insufficient data for EMA calculation. Need ${period} points, got ${closingPrices.length}`
    );
    return null;
  }

  try {
    const emaValues = EMA.calculate({
      values: closingPrices,
      period,
    });

    // Return the most recent EMA value
    return emaValues.length > 0 ? emaValues[emaValues.length - 1] : null;
  } catch (error) {
    console.error('Error calculating EMA:', error);
    return null;
  }
}

/**
 * Calculate all EMA values for historical data
 * @param historicalData Historical stock data
 * @param period Period for EMA calculation (default: 20)
 * @returns Array of EMA values with dates
 */
export function calculateEMAHistory(
  historicalData: HistoricalData,
  period: number = 20
): Array<{ datetime: string; value: number | null }> {
  const closingPrices = getClosingPrices(historicalData);
  const dates = [...historicalData.values].reverse();

  if (closingPrices.length < period) {
    return [];
  }

  try {
    const emaValues = EMA.calculate({
      values: closingPrices,
      period,
    });

    // EMA starts after period warmup, so align dates
    const startIndex = closingPrices.length - emaValues.length;
    return emaValues.map((value, index) => ({
      datetime: dates[startIndex + index].datetime,
      value: value || null,
    }));
  } catch (error) {
    console.error('Error calculating EMA history:', error);
    return [];
  }
}

/**
 * Calculate average volume over a period
 * @param historicalData Historical stock data
 * @param period Period for average calculation (default: 20)
 * @returns Average volume or null if insufficient data
 */
export function calculateAverageVolume(
  historicalData: HistoricalData,
  period: number = 20
): number | null {
  const volumes = getVolumes(historicalData);

  // Need at least period data points
  if (volumes.length < period) {
    console.warn(
      `Insufficient data for average volume calculation. Need ${period} points, got ${volumes.length}`
    );
    return null;
  }

  try {
    // Get the most recent 'period' volumes
    const recentVolumes = volumes.slice(-period);
    const sum = recentVolumes.reduce((acc, vol) => acc + vol, 0);
    return sum / period;
  } catch (error) {
    console.error('Error calculating average volume:', error);
    return null;
  }
}

/**
 * Calculate average volume history
 * @param historicalData Historical stock data
 * @param period Period for average calculation (default: 20)
 * @returns Array of average volume values with dates
 */
export function calculateAverageVolumeHistory(
  historicalData: HistoricalData,
  period: number = 20
): Array<{ datetime: string; value: number | null }> {
  const volumes = getVolumes(historicalData);
  const dates = [...historicalData.values].reverse();

  if (volumes.length < period) {
    return [];
  }

  try {
    const avgVolumes: number[] = [];

    // Calculate rolling average
    for (let i = period - 1; i < volumes.length; i++) {
      const slice = volumes.slice(i - period + 1, i + 1);
      const avg = slice.reduce((acc, vol) => acc + vol, 0) / period;
      avgVolumes.push(avg);
    }

    // Align with dates (starting from period-1)
    const startIndex = period - 1;
    return avgVolumes.map((value, index) => ({
      datetime: dates[startIndex + index].datetime,
      value: value || null,
    }));
  } catch (error) {
    console.error('Error calculating average volume history:', error);
    return [];
  }
}

/**
 * Helper to get the required number of days for a specific indicator and period
 * This helps determine how much historical data to fetch
 * @param indicatorType Type of indicator (RSI, SMA, EMA, AVG_VOLUME)
 * @param period Period for the indicator
 * @returns Recommended number of days to fetch
 */
export function getRequiredDataPoints(
  indicatorType: string,
  period: number
): number {
  switch (indicatorType.toUpperCase()) {
    case 'RSI':
      // RSI needs period + 1 for calculation, but more for warmup
      return period * 3;
    case 'SMA':
      // SMA needs exactly period data points, but fetch more for history
      return period * 2;
    case 'EMA':
      // EMA needs period data points, but more for accurate calculation
      return period * 3;
    case 'AVG_VOLUME':
      // Average volume needs period data points
      return period * 2;
    default:
      // Default: fetch 100 days
      return 100;
  }
}
