/**
 * API routes for managing transactions
 * GET /api/transactions - List all transactions for authenticated user
 * POST /api/transactions - Create a new transaction
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import {
  getTransactions,
  createTransaction,
} from '@/lib/db/queries/transactions';
import { updateCash } from '@/lib/db/queries/portfolio';
import { ensureUserExists } from '@/lib/db/queries/user-init';
import type { TransactionType } from '@/lib/db/schema';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler - List all transactions for authenticated user
 * Query params:
 * - symbol?: Filter by stock symbol
 * - transaction_type?: Filter by type (BUY/SELL)
 * - start_date?: Filter by start date (Unix timestamp)
 * - end_date?: Filter by end date (Unix timestamp)
 * - limit?: Limit number of results
 * - offset?: Offset for pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to access transactions',
        },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || undefined;
    const transactionType = searchParams.get('transaction_type') || undefined;
    const startDateParam = searchParams.get('start_date');
    const endDateParam = searchParams.get('end_date');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Parse optional filters
    const filters: {
      symbol?: string;
      transaction_type?: TransactionType;
      start_date?: number;
      end_date?: number;
      limit?: number;
      offset?: number;
    } = {};

    if (symbol) {
      filters.symbol = symbol.toUpperCase();
    }

    if (
      transactionType &&
      (transactionType === 'BUY' || transactionType === 'SELL')
    ) {
      filters.transaction_type = transactionType;
    }

    if (startDateParam) {
      const startDate = parseInt(startDateParam, 10);
      if (!isNaN(startDate)) {
        filters.start_date = startDate;
      }
    }

    if (endDateParam) {
      const endDate = parseInt(endDateParam, 10);
      if (!isNaN(endDate)) {
        filters.end_date = endDate;
      }
    }

    if (limitParam) {
      const limit = parseInt(limitParam, 10);
      if (!isNaN(limit) && limit > 0) {
        filters.limit = Math.min(limit, 100); // Cap at 100
      }
    }

    if (offsetParam) {
      const offset = parseInt(offsetParam, 10);
      if (!isNaN(offset) && offset >= 0) {
        filters.offset = offset;
      }
    }

    console.log(`[API] Getting transactions for user ${userId}`, filters);

    // Ensure user exists in database (creates if needed)
    const user = await currentUser();
    if (user?.emailAddresses?.[0]?.emailAddress) {
      await ensureUserExists(userId, user.emailAddresses[0].emailAddress);
    }

    // Fetch transactions
    const transactions = await getTransactions(userId, filters);

    return NextResponse.json(
      {
        success: true,
        data: transactions,
        count: transactions.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error getting transactions:', error);

    return NextResponse.json(
      {
        error: 'Failed to get transactions',
        message: 'An error occurred while fetching transactions',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Create a new transaction
 * Request body:
 * {
 *   symbol: string,
 *   transaction_type: "BUY" | "SELL",
 *   quantity: number,
 *   price: number,
 *   transaction_date?: number (Unix timestamp, defaults to now),
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to create transactions',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as {
      symbol: string;
      transaction_type: 'BUY' | 'SELL';
      quantity: number;
      price: number;
      transaction_date?: number | string;
      notes?: string;
      recommendation_id?: string;
    };

    // Validate required fields
    if (!body.symbol || typeof body.symbol !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Symbol is required',
        },
        { status: 400 }
      );
    }

    if (!body.transaction_type || !['BUY', 'SELL'].includes(body.transaction_type)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Transaction type must be either BUY or SELL',
        },
        { status: 400 }
      );
    }

    if (
      typeof body.quantity !== 'number' ||
      body.quantity <= 0 ||
      !Number.isFinite(body.quantity)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Quantity must be a positive number',
        },
        { status: 400 }
      );
    }

    if (
      typeof body.price !== 'number' ||
      body.price <= 0 ||
      !Number.isFinite(body.price)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Price must be a positive number',
        },
        { status: 400 }
      );
    }

    // Validate transaction_date if provided
    let transactionDate: number | undefined;
    if (body.transaction_date !== undefined) {
      transactionDate = typeof body.transaction_date === 'string'
        ? parseInt(body.transaction_date, 10)
        : body.transaction_date;
      if (isNaN(transactionDate) || transactionDate < 0) {
        return NextResponse.json(
          {
            error: 'Invalid request',
            message: 'Transaction date must be a valid Unix timestamp',
          },
          { status: 400 }
        );
      }
    }

    console.log(`[API] Creating transaction for user ${userId}`, {
      symbol: body.symbol,
      type: body.transaction_type,
      quantity: body.quantity,
      price: body.price,
    });

    // Ensure user exists in database (creates if needed)
    const user = await currentUser();
    if (user?.emailAddresses?.[0]?.emailAddress) {
      await ensureUserExists(userId, user.emailAddresses[0].emailAddress);
    }

    // Calculate transaction amount
    const amount = body.quantity * body.price;

    // Update cash balance based on transaction type
    try {
      if (body.transaction_type === 'BUY') {
        // Deduct cash for BUY transactions
        await updateCash(userId, -amount);
      } else if (body.transaction_type === 'SELL') {
        // Add cash for SELL transactions
        await updateCash(userId, amount);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Insufficient funds')) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            message: 'Not enough cash available for this purchase',
          },
          { status: 400 }
        );
      }
      throw error;
    }

    // Create transaction
    const transaction = await createTransaction({
      user_id: userId,
      symbol: body.symbol.trim().toUpperCase(),
      transaction_type: body.transaction_type as TransactionType,
      quantity: body.quantity,
      price: body.price,
      transaction_date: transactionDate,
      notes: body.notes?.trim() || undefined,
    });

    console.log(`[API] Transaction created successfully: ${transaction.id}`);

    return NextResponse.json(
      {
        success: true,
        data: transaction,
        message: 'Transaction created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating transaction:', error);

    return NextResponse.json(
      {
        error: 'Failed to create transaction',
        message: 'An error occurred while creating the transaction',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
