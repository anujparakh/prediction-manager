/**
 * API route for managing individual recommendations
 * GET /api/recommendations/[id] - Get a specific recommendation
 * PATCH /api/recommendations/[id] - Update recommendation status
 * DELETE /api/recommendations/[id] - Delete a recommendation
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getRecommendationById,
  updateRecommendationStatus,
  deleteRecommendation,
} from '@/lib/db/queries/recommendations';
import type { RecommendationStatus } from '@/lib/db/schema';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler - Get a specific recommendation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    console.log(`[API] Fetching recommendation ${id} for user ${userId}`);

    // Get recommendation
    const recommendation = await getRecommendationById(id, userId);

    if (!recommendation) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Recommendation not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: recommendation,
        message: 'Recommendation fetched successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error fetching recommendation:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch recommendation',
        message: 'An error occurred while fetching the recommendation',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH handler - Update recommendation status
 *
 * Body:
 * {
 *   "status": "EXECUTED" | "DISMISSED"
 * }
 *
 * When status is set to EXECUTED:
 * - Creates a transaction record
 * - Updates cash balance (BUY: subtract, SELL: add)
 * - Sets recommendation.status = 'EXECUTED'
 * - Sets recommendation.executed_at = now()
 *
 * When status is set to DISMISSED:
 * - Sets recommendation.status = 'DISMISSED'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to update recommendations',
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json() as { status?: string };
    const { status } = body;

    // Validate status
    if (!status) {
      return NextResponse.json(
        {
          error: 'Missing status',
          message: 'Status is required',
        },
        { status: 400 }
      );
    }

    if (!['EXECUTED', 'DISMISSED', 'PENDING'].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status',
          message: 'Status must be PENDING, EXECUTED, or DISMISSED',
        },
        { status: 400 }
      );
    }

    console.log(
      `[API] Updating recommendation ${id} status to ${status} for user ${userId}`
    );

    // Update recommendation status
    // This will automatically create transaction and update cash if status is EXECUTED
    const updatedRecommendation = await updateRecommendationStatus(
      id,
      userId,
      status as RecommendationStatus
    );

    if (!updatedRecommendation) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Recommendation not found',
        },
        { status: 404 }
      );
    }

    const actionMessage =
      status === 'EXECUTED'
        ? 'Recommendation executed successfully. Transaction created and cash balance updated.'
        : status === 'DISMISSED'
          ? 'Recommendation dismissed successfully'
          : 'Recommendation status updated successfully';

    console.log(
      `[API] Successfully updated recommendation ${id} to ${status}`
    );

    return NextResponse.json(
      {
        success: true,
        data: updatedRecommendation,
        message: actionMessage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error updating recommendation:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    // Check for specific error types
    if (errorMessage.includes('INSUFFICIENT_FUNDS')) {
      return NextResponse.json(
        {
          error: 'Insufficient funds',
          message:
            'You do not have enough cash available to execute this recommendation',
          details:
            process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 400 }
      );
    }

    if (errorMessage.includes('INVALID_STATUS_CHANGE')) {
      return NextResponse.json(
        {
          error: 'Invalid status change',
          message: errorMessage,
          details:
            process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update recommendation',
        message: 'An error occurred while updating the recommendation',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler - Delete a recommendation
 *
 * Note: Typically you should dismiss recommendations rather than delete them
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to delete recommendations',
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    console.log(`[API] Deleting recommendation ${id} for user ${userId}`);

    // Delete recommendation
    const deleted = await deleteRecommendation(id, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Recommendation not found',
        },
        { status: 404 }
      );
    }

    console.log(`[API] Successfully deleted recommendation ${id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Recommendation deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error deleting recommendation:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to delete recommendation',
        message: 'An error occurred while deleting the recommendation',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
