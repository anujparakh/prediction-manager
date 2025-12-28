/**
 * API route for evaluating trading rules
 * POST /api/rules/evaluate - Evaluate all active rules for the authenticated user
 *
 * This is the core rule engine endpoint that:
 * 1. Fetches all active rules for the user
 * 2. Groups rules by symbol
 * 3. Fetches historical data for each symbol
 * 4. Evaluates each rule against the data
 * 5. Creates recommendations for triggered rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAllActiveRules } from '@/lib/db/queries/rules';
import { createRecommendation } from '@/lib/db/queries/recommendations';
import { getPortfolio } from '@/lib/db/queries/portfolio';
import { fetchHistoricalData } from '@/lib/stocks/api-client';
import { batchEvaluateRules } from '@/lib/rules/evaluator';
import { getRequiredDataDays } from '@/lib/rules/parser';
import type { Rule } from '@/lib/db/schema';
import type { HistoricalData } from '@/lib/stocks/types';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * POST handler - Evaluate all active rules for authenticated user
 *
 * Optional query params:
 * - symbol?: Only evaluate rules for specific symbol
 *
 * Returns:
 * - Array of recommendations (both triggered and not triggered)
 * - Evaluation statistics
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to evaluate rules',
        },
        { status: 401 }
      );
    }

    // Extract optional symbol filter
    const { searchParams } = new URL(request.url);
    const symbolFilter = searchParams.get('symbol')?.toUpperCase();

    console.log(
      `[API] Evaluating rules for user ${userId}${symbolFilter ? ` (symbol: ${symbolFilter})` : ''}`
    );

    // Fetch all active rules
    const filters = symbolFilter ? { symbol: symbolFilter } : undefined;
    const activeRules = await getAllActiveRules(userId);

    // Filter by symbol if specified
    const rules = symbolFilter
      ? activeRules.filter((r) => r.symbol === symbolFilter)
      : activeRules;

    if (rules.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: {
            recommendations: [],
            stats: {
              totalRules: 0,
              triggered: 0,
              notTriggered: 0,
              errors: 0,
            },
          },
          message: symbolFilter
            ? `No active rules found for symbol ${symbolFilter}`
            : 'No active rules found',
        },
        { status: 200 }
      );
    }

    console.log(`[API] Found ${rules.length} active rules to evaluate`);

    // Get user's portfolio to get cash available (for PERCENTAGE quantity type)
    const portfolio = await getPortfolio(userId);
    const cashAvailable = portfolio.cash_available;

    // Group rules by symbol for efficient data fetching
    const rulesBySymbol = new Map<string, Rule[]>();
    for (const rule of rules) {
      const existing = rulesBySymbol.get(rule.symbol) || [];
      existing.push(rule);
      rulesBySymbol.set(rule.symbol, existing);
    }

    console.log(
      `[API] Fetching historical data for ${rulesBySymbol.size} symbols`
    );

    // Fetch historical data for each symbol
    const stockDataMap = new Map<string, HistoricalData>();
    const fetchErrors: Array<{ symbol: string; error: string }> = [];

    for (const [symbol, symbolRules] of rulesBySymbol.entries()) {
      try {
        // Calculate required data days based on all rules for this symbol
        let maxDays = 100; // Default
        for (const rule of symbolRules) {
          const requiredDays = getRequiredDataDays(rule.expression);
          maxDays = Math.max(maxDays, requiredDays);
        }

        console.log(
          `[API] Fetching ${maxDays} days of data for ${symbol}`
        );

        // Fetch historical data
        const historicalData = await fetchHistoricalData(symbol, {
          limit: maxDays,
        });

        if (
          !historicalData.values ||
          historicalData.values.length === 0
        ) {
          throw new Error('No historical data available');
        }

        stockDataMap.set(symbol, historicalData);
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to fetch data';
        console.error(
          `[API] Error fetching data for ${symbol}:`,
          errorMessage
        );
        fetchErrors.push({ symbol, error: errorMessage });
      }
    }

    console.log(
      `[API] Successfully fetched data for ${stockDataMap.size} symbols`
    );

    // Evaluate all rules
    const evaluationResults = batchEvaluateRules(
      rules,
      stockDataMap,
      cashAvailable
    );

    console.log(`[API] Evaluated ${evaluationResults.length} rules`);

    // Create recommendations for triggered rules
    const recommendations = [];
    const stats = {
      totalRules: rules.length,
      triggered: 0,
      notTriggered: 0,
      errors: 0,
    };

    for (const { rule, result } of evaluationResults) {
      if (result.metadata.error) {
        stats.errors++;
        console.warn(
          `[API] Rule ${rule.id} evaluation error:`,
          result.metadata.error
        );
      } else if (result.triggered) {
        stats.triggered++;

        try {
          // Create recommendation
          const recommendation = await createRecommendation({
            user_id: userId,
            rule_id: rule.id,
            symbol: rule.symbol,
            action: rule.action,
            quantity: result.quantity,
            price: result.price,
            rule_name: rule.name,
            rule_expression: rule.expression,
            metadata: JSON.stringify(result.metadata),
          });

          recommendations.push({
            ...recommendation,
            rule: {
              id: rule.id,
              name: rule.name,
              expression: rule.expression,
            },
          });

          console.log(
            `[API] Created recommendation ${recommendation.id} for rule ${rule.id}`
          );
        } catch (error) {
          console.error(
            `[API] Error creating recommendation for rule ${rule.id}:`,
            error
          );
          stats.errors++;
        }
      } else {
        stats.notTriggered++;
      }
    }

    // Add fetch errors to response
    const fetchErrorMessages = fetchErrors.map(
      (e) => `${e.symbol}: ${e.error}`
    );

    console.log(
      `[API] Rule evaluation complete. Triggered: ${stats.triggered}, Not triggered: ${stats.notTriggered}, Errors: ${stats.errors}`
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          recommendations,
          stats,
          fetchErrors:
            fetchErrors.length > 0 ? fetchErrorMessages : undefined,
        },
        message: `Evaluated ${stats.totalRules} rules. Created ${recommendations.length} recommendations.`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error evaluating rules:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to evaluate rules',
        message: 'An error occurred while evaluating trading rules',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Get evaluation status and info
 * Useful for checking if rules can be evaluated
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'You must be logged in to check evaluation status',
        },
        { status: 401 }
      );
    }

    // Get active rules count
    const activeRules = await getAllActiveRules(userId);

    // Get unique symbols
    const symbols = new Set(activeRules.map((r) => r.symbol));

    // Get portfolio info
    const portfolio = await getPortfolio(userId);

    return NextResponse.json(
      {
        success: true,
        data: {
          canEvaluate: activeRules.length > 0,
          activeRulesCount: activeRules.length,
          symbolsCount: symbols.size,
          symbols: Array.from(symbols),
          cashAvailable: portfolio.cash_available,
        },
        message:
          activeRules.length > 0
            ? `Ready to evaluate ${activeRules.length} active rules`
            : 'No active rules to evaluate',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error getting evaluation status:', error);

    return NextResponse.json(
      {
        error: 'Failed to get evaluation status',
        message: 'An error occurred while checking evaluation status',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 }
    );
  }
}
