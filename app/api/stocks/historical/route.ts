/**
 * API route for fetching historical stock data
 * GET /api/stocks/historical?symbol=AAPL&from=2024-01-01&to=2024-12-31&limit=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchHistoricalData } from '@/lib/stocks/api-client';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler for historical stock data endpoint
 * @param request Next.js request object
 * @returns Historical stock data or error response
 */
export async function GET(request: NextRequest) {
  try {
    // Extract parameters from query
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const limitParam = searchParams.get('limit');

    // Validate symbol parameter
    if (!symbol) {
      return NextResponse.json(
        {
          error: 'Missing required parameter: symbol',
          message: 'Please provide a stock symbol (e.g., ?symbol=AAPL)',
        },
        { status: 400 }
      );
    }

    // Validate symbol format (basic check)
    if (!/^[A-Za-z]{1,5}$/.test(symbol)) {
      return NextResponse.json(
        {
          error: 'Invalid symbol format',
          message:
            'Symbol must be 1-5 letters (e.g., AAPL, MSFT, GOOGL)',
        },
        { status: 400 }
      );
    }

    // Parse and validate limit
    const limit = limitParam ? parseInt(limitParam, 10) : 100;
    if (isNaN(limit) || limit < 1 || limit > 5000) {
      return NextResponse.json(
        {
          error: 'Invalid limit parameter',
          message: 'Limit must be a number between 1 and 5000',
        },
        { status: 400 }
      );
    }

    // Validate date format if provided (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (from && !dateRegex.test(from)) {
      return NextResponse.json(
        {
          error: 'Invalid from date format',
          message: 'Date must be in YYYY-MM-DD format (e.g., 2024-01-01)',
        },
        { status: 400 }
      );
    }
    if (to && !dateRegex.test(to)) {
      return NextResponse.json(
        {
          error: 'Invalid to date format',
          message: 'Date must be in YYYY-MM-DD format (e.g., 2024-12-31)',
        },
        { status: 400 }
      );
    }

    // Validate date range
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (fromDate > toDate) {
        return NextResponse.json(
          {
            error: 'Invalid date range',
            message: 'From date must be before or equal to To date',
          },
          { status: 400 }
        );
      }
    }

    console.log(
      `[API] Fetching historical data for symbol: ${symbol}, from: ${from || 'N/A'}, to: ${to || 'N/A'}, limit: ${limit}`
    );

    // Fetch historical data from Twelve Data API
    const historicalData = await fetchHistoricalData(symbol, {
      from: from || undefined,
      to: to || undefined,
      limit,
    });

    // Check if we got any data
    if (!historicalData.values || historicalData.values.length === 0) {
      return NextResponse.json(
        {
          error: 'No data available',
          message:
            'No historical data available for the specified parameters.',
        },
        { status: 404 }
      );
    }

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: historicalData,
        meta: {
          count: historicalData.values.length,
          from: from || null,
          to: to || null,
          limit,
        },
      },
      {
        status: 200,
        headers: {
          // Cache for 5 minutes (historical data doesn't change frequently)
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching historical data:', error);

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
        error: 'Failed to fetch historical data',
        message:
          'An error occurred while fetching historical stock data.',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
