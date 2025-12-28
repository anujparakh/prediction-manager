/**
 * API route for calculating technical indicators
 * POST /api/stocks/indicators
 * Body: { symbol: string, indicators: [{ type: 'RSI', period: 14 }], days?: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/stocks/api-client';
import {
  calculateRSI,
  calculateRSIHistory,
  calculateSMA,
  calculateSMAHistory,
  calculateEMA,
  calculateEMAHistory,
  calculateAverageVolume,
  calculateAverageVolumeHistory,
  getRequiredDataPoints,
} from '@/lib/stocks/indicators';
import type {
  IndicatorRequest,
  IndicatorResponse,
  IndicatorValue,
} from '@/lib/stocks/types';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * Validate indicator request body
 */
function validateIndicatorRequest(body: any): {
  valid: boolean;
  error?: string;
} {
  if (!body.symbol || typeof body.symbol !== 'string') {
    return { valid: false, error: 'Missing or invalid symbol' };
  }

  if (!/^[A-Za-z]{1,5}$/.test(body.symbol)) {
    return {
      valid: false,
      error: 'Symbol must be 1-5 letters (e.g., AAPL, MSFT)',
    };
  }

  if (!Array.isArray(body.indicators) || body.indicators.length === 0) {
    return {
      valid: false,
      error: 'Indicators must be a non-empty array',
    };
  }

  const validTypes = ['RSI', 'SMA', 'EMA', 'AVG_VOLUME'];
  for (const indicator of body.indicators) {
    if (!indicator.type || !validTypes.includes(indicator.type.toUpperCase())) {
      return {
        valid: false,
        error: `Invalid indicator type. Must be one of: ${validTypes.join(', ')}`,
      };
    }

    if (
      !indicator.period ||
      typeof indicator.period !== 'number' ||
      indicator.period < 1 ||
      indicator.period > 200
    ) {
      return {
        valid: false,
        error: 'Period must be a number between 1 and 200',
      };
    }
  }

  if (body.days !== undefined) {
    if (
      typeof body.days !== 'number' ||
      body.days < 1 ||
      body.days > 5000
    ) {
      return {
        valid: false,
        error: 'Days must be a number between 1 and 5000',
      };
    }
  }

  return { valid: true };
}

/**
 * Calculate a single indicator
 */
function calculateIndicator(
  historicalData: any,
  type: string,
  period: number,
  includeHistory: boolean = false
): IndicatorValue {
  const normalizedType = type.toUpperCase();

  let value: number | null = null;
  let values: Array<{ datetime: string; value: number | null }> | undefined =
    undefined;

  switch (normalizedType) {
    case 'RSI':
      value = calculateRSI(historicalData, period);
      if (includeHistory) {
        values = calculateRSIHistory(historicalData, period);
      }
      break;

    case 'SMA':
      value = calculateSMA(historicalData, period);
      if (includeHistory) {
        values = calculateSMAHistory(historicalData, period);
      }
      break;

    case 'EMA':
      value = calculateEMA(historicalData, period);
      if (includeHistory) {
        values = calculateEMAHistory(historicalData, period);
      }
      break;

    case 'AVG_VOLUME':
      value = calculateAverageVolume(historicalData, period);
      if (includeHistory) {
        values = calculateAverageVolumeHistory(historicalData, period);
      }
      break;

    default:
      throw new Error(`Unsupported indicator type: ${type}`);
  }

  return {
    type: normalizedType,
    period,
    value,
    values,
  };
}

/**
 * POST handler for indicators endpoint
 * @param request Next.js request object
 * @returns Calculated indicators or error response
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    let body: IndicatorRequest;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Invalid JSON body',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    // Validate request
    const validation = validateIndicatorRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: validation.error,
        },
        { status: 400 }
      );
    }

    const { symbol, indicators, days } = body;

    console.log(
      `[API] Calculating indicators for ${symbol}:`,
      indicators.map((i) => `${i.type}(${i.period})`).join(', ')
    );

    // Determine how much historical data we need
    let requiredDays = days || 100;
    if (!days) {
      // Calculate the maximum required data points across all indicators
      const maxRequired = Math.max(
        ...indicators.map((ind) =>
          getRequiredDataPoints(ind.type, ind.period)
        )
      );
      requiredDays = Math.max(requiredDays, maxRequired);
    }

    // Fetch historical data
    console.log(
      `[API] Fetching ${requiredDays} days of historical data for ${symbol}`
    );
    const historicalData = await fetchHistoricalData(symbol, {
      limit: Math.min(requiredDays, 5000),
    });

    // Check if we got any data
    if (!historicalData.values || historicalData.values.length === 0) {
      return NextResponse.json(
        {
          error: 'No data available',
          message:
            'No historical data available for the specified symbol.',
        },
        { status: 404 }
      );
    }

    // Check if we have enough data for the requested indicators
    const minRequired = Math.min(
      ...indicators.map((ind) => {
        const type = ind.type.toUpperCase();
        if (type === 'RSI') return ind.period + 1;
        return ind.period;
      })
    );

    if (historicalData.values.length < minRequired) {
      return NextResponse.json(
        {
          error: 'Insufficient data',
          message: `Need at least ${minRequired} data points, but only ${historicalData.values.length} available.`,
        },
        { status: 400 }
      );
    }

    // Calculate all requested indicators
    const calculatedIndicators: IndicatorValue[] = [];
    const errors: string[] = [];

    for (const indicator of indicators) {
      try {
        const result = calculateIndicator(
          historicalData,
          indicator.type,
          indicator.period,
          false // Don't include history by default to save bandwidth
        );
        calculatedIndicators.push(result);
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : 'Unknown error';
        console.error(
          `[API] Error calculating ${indicator.type}(${indicator.period}):`,
          errorMsg
        );
        errors.push(
          `Failed to calculate ${indicator.type}(${indicator.period}): ${errorMsg}`
        );
      }
    }

    // Return response
    const response: IndicatorResponse = {
      symbol: symbol.toUpperCase(),
      indicators: calculatedIndicators,
    };

    return NextResponse.json(
      {
        success: true,
        data: response,
        meta: {
          dataPoints: historicalData.values.length,
          errors: errors.length > 0 ? errors : undefined,
        },
      },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes (indicators based on historical data)
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API] Error calculating indicators:', error);

    // Handle specific error types
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    // Rate limit error
    if (errorMessage.includes('Rate limit exceeded')) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message:
            'API rate limit exceeded. Please try again later.',
          details: errorMessage,
        },
        { status: 429 }
      );
    }

    // Symbol not found error
    if (
      errorMessage.includes('Symbol not found') ||
      errorMessage.includes('Invalid symbol')
    ) {
      return NextResponse.json(
        {
          error: 'Symbol not found',
          message: 'The requested stock symbol was not found.',
          details: errorMessage,
        },
        { status: 404 }
      );
    }

    // API key error
    if (
      errorMessage.includes('Invalid API key') ||
      errorMessage.includes('API key')
    ) {
      return NextResponse.json(
        {
          error: 'API configuration error',
          message: 'Stock data service is not properly configured.',
          details:
            process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        error: 'Failed to calculate indicators',
        message:
          'An error occurred while calculating technical indicators.',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
