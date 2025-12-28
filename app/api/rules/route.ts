/**
 * API routes for managing trading rules
 * GET /api/rules - List all rules for authenticated user
 * POST /api/rules - Create a new rule
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRules, createRule } from '@/lib/db/queries/rules';
import { validateRule } from '@/lib/rules/validators';
import type { RuleAction, QuantityType } from '@/lib/db/schema';

// Use Edge Runtime for Cloudflare Workers compatibility

/**
 * GET handler - List all rules for authenticated user
 * Query params:
 * - symbol?: Filter by stock symbol
 * - is_active?: Filter by active status (true/false)
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
          message: 'You must be logged in to access rules',
        },
        { status: 401 }
      );
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || undefined;
    const isActiveParam = searchParams.get('is_active');
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    // Parse optional filters
    const filters: {
      symbol?: string;
      is_active?: boolean;
      limit?: number;
      offset?: number;
    } = {};

    if (symbol) {
      filters.symbol = symbol.toUpperCase();
    }

    if (isActiveParam !== null) {
      filters.is_active = isActiveParam === 'true';
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

    console.log(`[API] Getting rules for user ${userId}`, filters);

    // Fetch rules
    const rules = await getRules(userId, filters);

    return NextResponse.json(
      {
        success: true,
        data: rules,
        count: rules.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Error getting rules:', error);

    return NextResponse.json(
      {
        error: 'Failed to get rules',
        message: 'An error occurred while fetching rules',
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
 * POST handler - Create a new rule
 * Request body:
 * {
 *   name: string,
 *   description?: string,
 *   expression: string,
 *   action: "BUY" | "SELL",
 *   symbol: string,
 *   quantity_type: "FIXED" | "PERCENTAGE" | "EXPRESSION",
 *   quantity_value: string,
 *   is_active?: boolean
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
          message: 'You must be logged in to create rules',
        },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as {
      name: string;
      description?: string;
      expression: string;
      action: 'BUY' | 'SELL';
      symbol: string;
      quantity_type: string;
      quantity_value: string;
      is_active?: boolean;
    };

    // Validate required fields
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Rule name is required',
        },
        { status: 400 }
      );
    }

    if (!body.expression || typeof body.expression !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Rule expression is required',
        },
        { status: 400 }
      );
    }

    if (!body.action || !['BUY', 'SELL'].includes(body.action)) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Action must be either BUY or SELL',
        },
        { status: 400 }
      );
    }

    if (!body.symbol || typeof body.symbol !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Stock symbol is required',
        },
        { status: 400 }
      );
    }

    if (
      !body.quantity_type ||
      !['FIXED', 'PERCENTAGE', 'EXPRESSION'].includes(body.quantity_type)
    ) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Quantity type must be FIXED, PERCENTAGE, or EXPRESSION',
        },
        { status: 400 }
      );
    }

    if (!body.quantity_value || typeof body.quantity_value !== 'string') {
      return NextResponse.json(
        {
          error: 'Invalid request',
          message: 'Quantity value is required',
        },
        { status: 400 }
      );
    }

    // Validate rule data
    console.log(`[API] Validating rule for user ${userId}`);
    const validationResult = await validateRule({
      expression: body.expression,
      symbol: body.symbol,
      quantity_type: body.quantity_type as QuantityType,
      quantity_value: body.quantity_value,
    });

    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid rule',
          message: validationResult.error || 'Rule validation failed',
          details: validationResult.details,
        },
        { status: 400 }
      );
    }

    // Create rule
    console.log(`[API] Creating rule for user ${userId}`);
    const rule = await createRule({
      user_id: userId,
      name: body.name.trim(),
      description: body.description?.trim() || undefined,
      expression: body.expression.trim(),
      action: body.action as RuleAction,
      symbol: body.symbol.trim().toUpperCase(),
      quantity_type: body.quantity_type as QuantityType,
      quantity_value: body.quantity_value.trim(),
      is_active: body.is_active !== false, // Default to true
    });

    console.log(`[API] Rule created successfully: ${rule.id}`);

    return NextResponse.json(
      {
        success: true,
        data: rule,
        message: 'Rule created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[API] Error creating rule:', error);

    // Check for database errors
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('UNIQUE constraint')) {
      return NextResponse.json(
        {
          error: 'Duplicate rule',
          message: 'A rule with this configuration already exists',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create rule',
        message: 'An error occurred while creating the rule',
        details:
          process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}
