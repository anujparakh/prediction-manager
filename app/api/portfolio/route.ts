/**
 * API routes for managing user portfolio
 * GET /api/portfolio - Get portfolio with holdings and current prices
 * PATCH /api/portfolio - Update cash balance
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { getPortfolio, setCash } from '@/lib/db/queries/portfolio';
import { getStockQuote } from '@/lib/stocks/quote';
import { ensureUserExists } from '@/lib/db/queries/user-init';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler - Get portfolio with holdings and current prices
 * Returns:
 * {
 *   cash_available: number,
 *   holdings: Array<{
 *     symbol: string,
 *     quantity: number,
 *     average_price: number,
 *     current_price: number,
 *     total_cost: number,
 *     total_value: number,
 *     profit_loss: number,
 *     profit_loss_percent: number
 *   }>,
 *   total_invested: number,
 *   total_value: number,
 *   total_profit_loss: number,
 *   total_profit_loss_percent: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to access portfolio',
        },
        { status: 401 }
      );
    }

    console.log(`[API] Getting portfolio for user ${userId}`);

    // Ensure user exists in database (creates if needed)
    const user = await currentUser();
    if (user?.emailAddresses?.[0]?.emailAddress) {
      await ensureUserExists(userId, user.emailAddresses[0].emailAddress);
    }

    // Get basic portfolio data (cash + holdings)
    const portfolio = await getPortfolio(userId);

    // Fetch current prices for all holdings
    const holdingsWithPrices = await Promise.all(
      portfolio.holdings.map(async holding => {
        try {
          const quote = await getStockQuote(holding.symbol);
          const currentPrice = quote.price;
          const totalCost = holding.quantity * holding.average_price;
          const totalValue = holding.quantity * currentPrice;
          const profitLoss = totalValue - totalCost;
          const profitLossPercent =
            totalCost > 0 ? (profitLoss / totalCost) * 100 : 0;

          return {
            symbol: holding.symbol,
            quantity: holding.quantity,
            average_price: holding.average_price,
            current_price: currentPrice,
            total_cost: totalCost,
            total_value: totalValue,
            profit_loss: profitLoss,
            profit_loss_percent: profitLossPercent,
          };
        } catch (error) {
          console.error(
            `[API] Error getting price for ${holding.symbol}:`,
            error
          );
          // Return holding with null current price if quote fails
          const totalCost = holding.quantity * holding.average_price;
          return {
            symbol: holding.symbol,
            quantity: holding.quantity,
            average_price: holding.average_price,
            current_price: holding.average_price, // Fallback to average price
            total_cost: totalCost,
            total_value: totalCost,
            profit_loss: 0,
            profit_loss_percent: 0,
          };
        }
      })
    );

    // Calculate totals
    const totalInvested = holdingsWithPrices.reduce(
      (sum, h) => sum + h.total_cost,
      0
    );
    const totalHoldingsValue = holdingsWithPrices.reduce(
      (sum, h) => sum + h.total_value,
      0
    );
    const totalValue = portfolio.cash_available + totalHoldingsValue;
    const totalProfitLoss = totalHoldingsValue - totalInvested;
    const totalProfitLossPercent =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          cash_available: portfolio.cash_available,
          holdings: holdingsWithPrices,
          total_invested: totalInvested,
          total_value: totalValue,
          total_profit_loss: totalProfitLoss,
          total_profit_loss_percent: totalProfitLossPercent,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error getting portfolio:', error);

    return NextResponse.json(
      {
        error: 'Failed to get portfolio',
        message: 'An error occurred while fetching portfolio',
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
 * PATCH handler - Update cash balance
 * Request body:
 * {
 *   cash_available: number
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to update cash balance',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as { cash_available: number };

    // Validate cash_available
    if (
      typeof body.cash_available !== 'number' ||
      body.cash_available < 0 ||
      !Number.isFinite(body.cash_available)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Cash balance must be a valid positive number',
        },
        { status: 400 }
      );
    }

    console.log(
      `[API] Updating cash balance for user ${userId} to ${body.cash_available}`
    );

    // Update cash balance
    const newBalance = await setCash(userId, body.cash_available);

    return NextResponse.json(
      {
        success: true,
        data: {
          cash_available: newBalance,
        },
        message: 'Cash balance updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error updating cash balance:', error);

    return NextResponse.json(
      {
        error: 'Failed to update cash balance',
        message: 'An error occurred while updating cash balance',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
