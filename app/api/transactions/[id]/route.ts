/**
 * API routes for managing a single transaction
 * DELETE /api/transactions/[id] - Delete a transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getTransactionById,
  deleteTransaction,
} from '@/lib/db/queries/transactions';
import { updateCash } from '@/lib/db/queries/portfolio';

// Use Edge Runtime for Cloudflare Workers compatibility

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * DELETE handler - Delete a transaction
 * Reverses the cash balance change from the transaction
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to delete transactions',
        },
        { status: 401 }
      );
    }

    const { id } = await context.params;

    console.log(`[API] Deleting transaction ${id} for user ${userId}`);

    // Get transaction to verify ownership and get details
    const transaction = await getTransactionById(id, userId);
    if (!transaction) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Transaction not found or does not belong to you',
        },
        { status: 404 }
      );
    }

    // Reverse the cash balance change
    // If it was a BUY, add cash back
    // If it was a SELL, deduct cash back
    const cashChange =
      transaction.transaction_type === 'BUY'
        ? transaction.total_amount // Add back what was spent
        : -transaction.total_amount; // Remove what was gained

    try {
      await updateCash(userId, cashChange);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient funds')) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            message:
              'Cannot delete this SELL transaction as it would result in negative cash balance. Please add cash first.',
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Delete the transaction
    const deleted = await deleteTransaction(id, userId);
    if (!deleted) {
      return NextResponse.json(
        {
          error: 'Not found',
          message: 'Transaction not found',
        },
        { status: 404 }
      );
    }

    console.log(`[API] Transaction ${id} deleted successfully`);

    return NextResponse.json(
      {
        success: true,
        message: 'Transaction deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error deleting transaction:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete transaction',
        message: 'An error occurred while deleting the transaction',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
