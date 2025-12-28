/**
 * API route for managing recommendations
 * GET /api/recommendations - Get all recommendations for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRecommendations, getRecommendationStats } from '@/lib/db/queries/recommendations';
import type { RecommendationStatus } from '@/lib/db/schema';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler - Get all recommendations for authenticated user
 *
 * Optional query params:
 * - status?: 'PENDING' | 'EXECUTED' | 'DISMISSED' - Filter by status
 * - symbol?: Stock symbol - Filter by symbol
 * - limit?: Number of results to return
 * - offset?: Offset for pagination
 *
 * Returns:
 * - Array of recommendations
 * - Stats about recommendation counts
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to view recommendations',
        },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as RecommendationStatus | null;
    const symbol = searchParams.get('symbol');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = limitParam ? parseInt(limitParam, 10) : undefined;
    const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;

    // Build filters
    const filters: {
      status?: RecommendationStatus;
      symbol?: string;
      limit?: number;
      offset?: number;
    } = {};

    if (status) {
      if (!['PENDING', 'EXECUTED', 'DISMISSED'].includes(status)) {
        return NextResponse.json(
          {
            error: 'Invalid status',
            message: 'Status must be PENDING, EXECUTED, or DISMISSED',
          },
          { status: 400 }
        );
      }
      filters.status = status;
    }

    if (symbol) {
      filters.symbol = symbol.toUpperCase();
    }

    if (limit !== undefined) {
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          {
            error: 'Invalid limit',
            message: 'Limit must be a positive number',
          },
          { status: 400 }
        );
      }
      filters.limit = limit;
    }

    if (offset !== undefined) {
      if (isNaN(offset) || offset < 0) {
        return NextResponse.json(
          {
            error: 'Invalid offset',
            message: 'Offset must be a non-negative number',
          },
          { status: 400 }
        );
      }
      filters.offset = offset;
    }

    console.log(`[API] Fetching recommendations for user ${userId}`, filters);

    // Get recommendations and stats in parallel
    const [recommendations, stats] = await Promise.all([
      getRecommendations(userId, filters),
      getRecommendationStats(userId),
    ]);

    console.log(
      `[API] Found ${recommendations.length} recommendations for user ${userId}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          recommendations,
          stats,
          filters,
        },
        message: `Found ${recommendations.length} recommendations`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching recommendations:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch recommendations',
        message: 'An error occurred while fetching recommendations',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
