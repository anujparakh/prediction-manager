/**
 * API route for fetching stock quotes
 * GET /api/stocks/quote?symbol=AAPL
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchQuote } from '@/lib/stocks/api-client';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler for stock quote endpoint
 * @param request Next.js request object
 * @returns Stock quote data or error response
 */
export async function GET(request: NextRequest) {
  try {
    // Extract symbol from query parameters
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

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

    console.log(`[API] Fetching quote for symbol: ${symbol}`);

    // Fetch quote from Twelve Data API
    const quote = await fetchQuote(symbol);

    // Return successful response
    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error('[API] Error fetching quote:', error);

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
        error: 'Failed to fetch quote',
        message: 'An error occurred while fetching stock quote data.',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
